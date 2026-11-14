import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { randomUUID } from "node:crypto";

export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const AVATAR_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface AvatarUploadResult {
  success: boolean;
  error?: string;
  publicUrl?: string;
}

function hasImageSignature(buffer: Buffer, contentType: string): boolean {
  if (contentType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (contentType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
}

export function parseAvatarImage(dataUrl: string): { buffer: Buffer; contentType: string; extension: string } {
  const match = dataUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  const contentType = match ? `image/${match[1]}` : "";
  const extension = AVATAR_MIME_EXTENSIONS[contentType];

  if (!match || !extension || !match[2]) {
    throw new Error("頭像只支援 JPG、PNG 或 WebP 格式");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > MAX_AVATAR_BYTES) {
    throw new Error("頭像大小不可超過 2MB");
  }

  if (!hasImageSignature(buffer, contentType)) {
    throw new Error("頭像只支援 JPG、PNG 或 WebP 格式");
  }

  return { buffer, contentType, extension };
}

export function avatarPathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${AVATAR_BUCKET}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex < 0) return null;

  const path = decodeURIComponent(url.slice(markerIndex + marker.length).split("?")[0]);
  const firstSegment = path.split("/")[0] ?? "";
  return firstSegment ? path : null;
}

export async function uploadAvatar(
  supabase: SupabaseClient<Database>,
  { userId, imageDataUrl }: { userId: string; imageDataUrl: string },
): Promise<AvatarUploadResult> {
  let parsed: ReturnType<typeof parseAvatarImage>;
  try {
    parsed = parseAvatarImage(imageDataUrl);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "頭像格式不正確" };
  }

  const path = `${userId}/${Date.now()}-${randomUUID()}.${parsed.extension}`;
  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, parsed.buffer, {
    contentType: parsed.contentType,
    upsert: false,
    cacheControl: "3600",
  });

  if (uploadError) {
    console.error("Failed to upload own avatar:", uploadError);
    return { success: false, error: "頭像上傳失敗，請稍後再試" };
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return { success: true, publicUrl: data.publicUrl };
}

export async function removeStoredAvatar(
  supabase: SupabaseClient<Database>,
  publicUrl: string | null,
  userId: string,
): Promise<void> {
  const path = publicUrl ? avatarPathFromPublicUrl(publicUrl) : null;
  if (!path) return;
  if ((path.split("/")[0] ?? "") !== userId) return;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  if (error) {
    console.warn("Failed to remove old avatar object:", error);
  }
}
