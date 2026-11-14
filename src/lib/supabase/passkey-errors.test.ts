import { describePasskeyError } from "./passkey-errors";
import assert from "node:assert/strict";
import { test } from "node:test";

test("maps an unsupported browser to Traditional Chinese copy", () => {
  const message = describePasskeyError({ message: "Browser does not support WebAuthn" });
  assert.equal(message, "此裝置或瀏覽器不支援 Passkey。");
});

test("maps the Supabase passkey-disabled error code", () => {
  const message = describePasskeyError({ code: "passkey_disabled", message: "Passkey sign-in is disabled" });
  assert.equal(message, "系統尚未啟用 Passkey，請改用密碼登入。");
});
