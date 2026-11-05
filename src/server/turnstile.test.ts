import { TURNSTILE_ERROR_MESSAGE } from "@/lib/turnstile";

import { normalizeTurnstileError, verifyTurnstileToken } from "./turnstile";
import assert from "node:assert/strict";
import test from "node:test";

test("rejects a missing Turnstile token", async () => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";

  const result = await verifyTurnstileToken("");

  assert.equal(result, false);
});

test("accepts a token when Cloudflare validates it", async () => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(input, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      secret: "test-secret",
      response: "valid-token",
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };

  const result = await verifyTurnstileToken("valid-token", fetcher);

  assert.equal(result, true);
});

test("rejects a token when Siteverify cannot be reached", async () => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  const fetcher: typeof fetch = async () => {
    throw new Error("network unavailable");
  };

  const result = await verifyTurnstileToken("valid-token", fetcher);

  assert.equal(result, false);
});

test("rejects a token when Siteverify returns an HTTP error", async () => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  const fetcher: typeof fetch = async () => new Response(JSON.stringify({ success: true }), { status: 500 });

  const result = await verifyTurnstileToken("valid-token", fetcher);

  assert.equal(result, false);
});

test("rejects a token when the Turnstile secret is missing", async () => {
  delete process.env.TURNSTILE_SECRET_KEY;
  const fetcher: typeof fetch = async () => new Response(JSON.stringify({ success: true }), { status: 200 });

  const result = await verifyTurnstileToken("valid-token", fetcher);

  assert.equal(result, false);
});

test("rejects a token when Cloudflare marks it invalid", async () => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  const fetcher: typeof fetch = async () =>
    new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), { status: 200 });

  const result = await verifyTurnstileToken("invalid-token", fetcher);

  assert.equal(result, false);
});

test("normalizes Supabase CAPTCHA failures by error code", () => {
  assert.equal(normalizeTurnstileError("verification failed", "captcha_failed"), TURNSTILE_ERROR_MESSAGE);
});
