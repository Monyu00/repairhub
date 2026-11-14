import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { avatarPathFromPublicUrl, MAX_AVATAR_BYTES, parseAvatarImage, uploadAvatar } from "./avatar";
import assert from "node:assert/strict";
import test from "node:test";

type StorageCall = { bucket: string; path: string; contentType?: string; upsert?: boolean; size?: number };

function fakeSupabase(options: { uploadError?: { message: string } | null } = {}) {
  const calls: Array<StorageCall & { action: string }> = [];
  const storage = {
    from: (bucket: string) => ({
      upload: async (path: string, buffer: Buffer, opts: { contentType?: string; upsert?: boolean }) => {
        calls.push({ action: "upload", bucket, path, ...opts, size: buffer.byteLength });
        return { data: { path }, error: options.uploadError ?? null };
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `https://supabase.test/storage/v1/object/public/${bucket}/${path}` },
        error: null,
      }),
      remove: async (paths: string[]) => {
        calls.push({ action: "remove", bucket, path: paths.join(",") });
        return { data: paths, error: null };
      },
    }),
  };

  return { supabase: { storage } as unknown as SupabaseClient<Database>, calls };
}

const PNG_AVATAR = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x68, 0x69]);
const WEBP_AVATAR = Buffer.from("RIFF0124WEBPVP8 data");

test("accepts JPG, PNG and WebP data URLs", () => {
  const parsed = parseAvatarImage(`data:image/webp;base64,${WEBP_AVATAR.toString("base64")}`);
  assert.equal(parsed.contentType, "image/webp");
  assert.equal(parsed.extension, "webp");
  assert.equal(parsed.buffer.toString("ascii", 0, 4), "RIFF");

  test("rejects image payloads without matching magic bytes", () => {
    for (const dataUrl of [
      "data:image/png;base64,aGk=",
      "data:image/webp;base64,aGk=",
      "data:image/jpeg;base64,aGk=",
    ]) {
      assert.throws(() => parseAvatarImage(dataUrl));
    }
  });
});

test("rejects unsupported image types", () => {
  for (const dataUrl of ["data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", "https://example.com/avatar.png"]) {
    assert.throws(() => parseAvatarImage(dataUrl));
  }
});

test("rejects oversized avatar payloads", () => {
  const dataUrl = `data:image/png;base64,${"A".repeat((MAX_AVATAR_BYTES * 4) / 3 + 10)}`;
  assert.throws(() => parseAvatarImage(dataUrl), /2MB/);
});

test("derives avatar storage path from a public URL", () => {
  assert.equal(
    avatarPathFromPublicUrl("https://supabase.test/storage/v1/object/public/avatars/user-1/abc.webp"),
    "user-1/abc.webp",
  );
  assert.equal(avatarPathFromPublicUrl("https://example.com/other.png"), null);
});

test("uploads avatar data under the owner folder", async () => {
  const { supabase, calls } = fakeSupabase();
  const result = await uploadAvatar(supabase, {
    userId: "user-1",
    imageDataUrl: `data:image/png;base64,${PNG_AVATAR.toString("base64")}`,
  });

  assert.equal(result.success, true);
  assert.match(
    result.publicUrl ?? "",
    /^https:\/\/supabase\.test\/storage\/v1\/object\/public\/avatars\/user-1\/\d+-[0-9a-f-]+\.png$/,
  );
  assert.equal(calls[0]?.bucket, "avatars");
  assert.equal(calls[0]?.upsert, false);
  assert.equal(calls[0]?.contentType, "image/png");
  assert.ok(calls[0]?.path.startsWith("user-1/"));
});

test("returns a failure result when storage upload fails", async () => {
  const { supabase } = fakeSupabase({ uploadError: { message: "storage unavailable" } });
  const result = await uploadAvatar(supabase, {
    userId: "user-1",
    imageDataUrl: `data:image/png;base64,${PNG_AVATAR.toString("base64")}`,
  });

  assert.equal(result.success, false);
  assert.equal(result.publicUrl, undefined);
});
