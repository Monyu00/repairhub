import {
  avatarInputSchema,
  canDeleteOwnAccount,
  changePasswordFormSchema,
  changePasswordSchema,
  notificationPreferencesSchema,
  profileInputSchema,
  resolveNotificationPreferences,
  visibleNotificationPreferenceKeys,
} from "./input";
import assert from "node:assert/strict";
import test from "node:test";

const LONG_50 = "顯".repeat(50);
const LONG_51 = "顯".repeat(51);

test("displayName 空白或只有空白會被擋下", () => {
  for (const displayName of ["", "   "]) {
    const result = profileInputSchema.safeParse({ displayName, department: "", phone: "" });
    assert.equal(result.success, false);
  }
});

test("displayName 超過 50 字元會被擋下，未超過可通過", () => {
  assert.equal(profileInputSchema.safeParse({ displayName: LONG_51, department: "", phone: "" }).success, false);

  const ok = profileInputSchema.safeParse({ displayName: `  ${LONG_50}  `, department: "", phone: "" });
  assert.equal(ok.success, true);
  if (ok.success) {
    assert.equal(ok.data.displayName, LONG_50);
  }
});

test("phone 合法樣式可通過且 trim", () => {
  for (const phone of ["", "0912-345-678", "#1234", "+886-2-1234-5678", "(02) 2345 6789"]) {
    const result = profileInputSchema.safeParse({ displayName: "張小明", department: "", phone });
    assert.equal(result.success, true, phone);
  }

  const trimmed = profileInputSchema.safeParse({ displayName: "張小明", department: "", phone: "  #1234  " });
  assert.equal(trimmed.success, true);
  if (trimmed.success) {
    assert.equal(trimmed.data.phone, "#1234");
  }
});

test("phone 含非白名單字元會被擋下", () => {
  for (const phone of ["0912中文", "0912abc", "0900-0000轉123", "09123456789012345678901234567890x"]) {
    const result = profileInputSchema.safeParse({ displayName: "張小明", department: "", phone });
    assert.equal(result.success, false, phone);
  }
});

test("phone 超過 30 字元會被擋下", () => {
  const result = profileInputSchema.safeParse({ displayName: "張小明", department: "", phone: "0".repeat(31) });
  assert.equal(result.success, false);
  assert.match(String(result.error?.issues[0]?.message), /30/);
});

test("department 上限 100，空白視為空字串", () => {
  const ok = profileInputSchema.safeParse({ displayName: "張小明", department: "總務處 事務組", phone: "" });
  assert.equal(ok.success, true);
  if (ok.success) {
    assert.equal(ok.data.department, "總務處 事務組");
  }

  const tooLong = profileInputSchema.safeParse({ displayName: "張小明", department: "處".repeat(101), phone: "" });
  assert.equal(tooLong.success, false);
  assert.match(String(tooLong.error?.issues[0]?.message), /100/);
});

test("notificationPreferences 需要 boolean", () => {
  assert.equal(notificationPreferencesSchema.safeParse({ ticketStatus: false, newTicket: true }).success, true);
  assert.equal(notificationPreferencesSchema.safeParse({ ticketStatus: "false", newTicket: true }).success, false);
});

test("resolveNotificationPreferences 缺 key 視為啟用", () => {
  assert.deepEqual(resolveNotificationPreferences({}), { ticketStatus: true, newTicket: true });
  assert.deepEqual(resolveNotificationPreferences(null), { ticketStatus: true, newTicket: true });
  assert.deepEqual(resolveNotificationPreferences(undefined), { ticketStatus: true, newTicket: true });
  assert.deepEqual(resolveNotificationPreferences({ ticket_status: false }), {
    ticketStatus: false,
    newTicket: true,
  });
  assert.deepEqual(resolveNotificationPreferences({ ticket_status: false, new_ticket: false }), {
    ticketStatus: false,
    newTicket: false,
  });
  assert.deepEqual(resolveNotificationPreferences({ ticket_status: true, new_ticket: true }), {
    ticketStatus: true,
    newTicket: true,
  });
});

test("changePassword 新密碼少於 8 字元或未填目前密碼會被擋下", () => {
  assert.equal(
    changePasswordSchema.safeParse({ currentPassword: "old-pass-1", newPassword: "1234567" }).success,
    false,
  );
  assert.equal(changePasswordSchema.safeParse({ currentPassword: "", newPassword: "new-pass-123" }).success, false);
  assert.equal(
    changePasswordSchema.safeParse({ currentPassword: "old-pass-1", newPassword: "new-pass-123" }).success,
    true,
  );
});

test("changePasswordFormSchema 兩欄不一致會被擋下", () => {
  const mismatch = changePasswordFormSchema.safeParse({
    currentPassword: "old-pass-1",
    newPassword: "new-pass-123",
    confirmPassword: "new-pass-124",
  });
  assert.equal(mismatch.success, false);
  assert.equal(mismatch.success === false && mismatch.error.issues[0]?.path[0], "confirmPassword");

  const match = changePasswordFormSchema.safeParse({
    currentPassword: "old-pass-1",
    newPassword: "new-pass-123",
    confirmPassword: "new-pass-123",
  });
  assert.equal(match.success, true);
});

test("visibleNotificationPreferenceKeys 依角色決定要顯示的項目", () => {
  assert.deepEqual(visibleNotificationPreferenceKeys("technician"), ["ticketStatus", "newTicket"]);
  assert.deepEqual(visibleNotificationPreferenceKeys("admin"), ["ticketStatus"]);
  assert.deepEqual(visibleNotificationPreferenceKeys(null), ["ticketStatus"]);
});

test("canDeleteOwnAccount 只擋下最後一位系統管理者", () => {
  assert.equal(canDeleteOwnAccount({ role: "admin", activeAdminCount: 1 }), false);
  assert.equal(canDeleteOwnAccount({ role: "admin", activeAdminCount: 2 }), true);
  assert.equal(canDeleteOwnAccount({ role: "technician", activeAdminCount: 1 }), true);
  assert.equal(canDeleteOwnAccount({ role: null, activeAdminCount: 0 }), true);
});

test("avatarInputSchema accepts keep, remove or one data URL", () => {
  const keep = avatarInputSchema.safeParse({});
  assert.equal(keep.success, true);
  if (keep.success) {
    assert.deepEqual(keep.data, { remove: false });
  }

  assert.equal(avatarInputSchema.safeParse({ remove: true }).success, true);
  assert.equal(avatarInputSchema.safeParse({ imageDataUrl: "data:image/webp;base64,aGk=" }).success, true);

  assert.equal(
    avatarInputSchema.safeParse({ remove: true, imageDataUrl: "data:image/webp;base64,aGk=" }).success,
    false,
  );
});
