import { type AccountSecurityAdapter, changePassword, changeRequiredPassword } from "./security";
import assert from "node:assert/strict";
import test from "node:test";

const VALID_INPUT = {
  currentPassword: "old-pass-1",
  newPassword: "new-pass-1",
  captchaToken: "token",
};

function createAdapter(options: { updateError?: { code?: string }; flagError?: Error } = {}) {
  const state = { updatedPassword: null as string | null, flagCleared: false };
  const adapter = {
    async verifyCurrentPassword({ password, captchaToken }: { password: string; captchaToken: string }) {
      if (!captchaToken) return { ok: false as const, error: "請先完成安全驗證" };
      if (password !== VALID_INPUT.currentPassword) return { ok: false as const, error: "目前密碼錯誤" };
      return { ok: true as const };
    },
    async updatePassword(password: string) {
      if (options.updateError) return { error: options.updateError };
      state.updatedPassword = password;
      return {};
    },
    async clearPasswordChangeRequired() {
      if (options.flagError) return { error: options.flagError };
      state.flagCleared = true;
      return {};
    },
  } satisfies AccountSecurityAdapter;

  return { adapter, state };
}

test("changes the password and clears Password Change Required", async () => {
  const { adapter, state } = createAdapter();

  assert.deepEqual(await changePassword(adapter, VALID_INPUT), { success: true });
  assert.equal(state.updatedPassword, "new-pass-1");
  assert.equal(state.flagCleared, true);
});

test("rejects missing Turnstile before changing a password", async () => {
  const { adapter, state } = createAdapter();

  const result = await changePassword(adapter, { ...VALID_INPUT, captchaToken: "" });
  assert.deepEqual(result, { success: false, error: "請先完成安全驗證" });
  assert.equal(state.updatedPassword, null);
  assert.equal(state.flagCleared, false);
});

test("rejects a wrong current password before changing a password", async () => {
  const { adapter, state } = createAdapter();

  const result = await changePassword(adapter, { ...VALID_INPUT, currentPassword: "wrong-pass-1" });
  assert.deepEqual(result, { success: false, error: "目前密碼錯誤" });
  assert.equal(state.updatedPassword, null);
  assert.equal(state.flagCleared, false);
});

test("enforces the 8-character minimum before changing a password", async () => {
  const { adapter, state } = createAdapter();

  const result = await changePassword(adapter, { ...VALID_INPUT, newPassword: "1234567" });
  assert.deepEqual(result, { success: false, error: "新密碼長度至少需要 8 個字元" });
  assert.equal(state.updatedPassword, null);
  assert.equal(state.flagCleared, false);
});

test("maps known Supabase password-update errors", async () => {
  const { adapter, state } = createAdapter({ updateError: { code: "same_password" } });

  const result = await changePassword(adapter, VALID_INPUT);
  assert.deepEqual(result, { success: false, error: "新密碼不可與目前密碼相同" });
  assert.equal(state.flagCleared, false);
});

test("does not report full success when Password Change Required clearing fails", async () => {
  const { adapter, state } = createAdapter({ flagError: new Error("profile update failed") });

  const result = await changePassword(adapter, VALID_INPUT);
  assert.deepEqual(result, {
    success: false,
    error: "密碼已更新，但無法完成登入準備，請重新登入後再試",
  });
  assert.equal(state.updatedPassword, "new-pass-1");
  assert.equal(state.flagCleared, false);
});

test("changes the required password without verifying the current password", async () => {
  const { adapter, state } = createAdapter();

  assert.deepEqual(await changeRequiredPassword(adapter, "new-pass-1"), { success: true });
  assert.equal(state.updatedPassword, "new-pass-1");
  assert.equal(state.flagCleared, true);
});

test("enforces the 8-character minimum before changing the required password", async () => {
  const { adapter, state } = createAdapter();

  const result = await changeRequiredPassword(adapter, "1234567");
  assert.deepEqual(result, { success: false, error: "新密碼長度至少需要 8 個字元" });
  assert.equal(state.updatedPassword, null);
  assert.equal(state.flagCleared, false);
});

test("maps known Supabase password-update errors for the required flow", async () => {
  const { adapter, state } = createAdapter({ updateError: { code: "same_password" } });

  const result = await changeRequiredPassword(adapter, "new-pass-1");
  assert.deepEqual(result, { success: false, error: "新密碼不可與目前密碼相同" });
  assert.equal(state.flagCleared, false);
});

test("does not report full success when required-flow flag clearing fails", async () => {
  const { adapter, state } = createAdapter({ flagError: new Error("profile update failed") });

  const result = await changeRequiredPassword(adapter, "new-pass-1");
  assert.deepEqual(result, {
    success: false,
    error: "密碼已更新，但無法完成登入準備，請重新登入後再試",
  });
  assert.equal(state.updatedPassword, "new-pass-1");
  assert.equal(state.flagCleared, false);
});
