import { z } from "zod";

export interface NotificationPreferences {
  ticketStatus: boolean;
  newTicket: boolean;
}

/** 聯絡電話 / 分機：數字與 + # * - ( ) 空白，允許空值，長度上限 30（見 #152 驗證細節）。 */
const PHONE_PATTERN = /^[0-9+#*\-()\s]{0,30}$/;

export const profileInputSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "顯示名稱 (Display Name) 為必填")
    .max(50, "顯示名稱 (Display Name) 長度不可超過 50 個字元"),
  department: z.string().trim().max(100, "所屬部門 / 單位長度不可超過 100 個字元"),
  phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, "聯絡電話 / 分機僅能使用數字與 + # * - ( ) 與空白，且長度上限為 30 個字元"),
});

export const notificationPreferencesSchema = z.object({
  ticketStatus: z.boolean(),
  newTicket: z.boolean(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "請輸入目前密碼"),
  newPassword: z.string().min(8, "新密碼長度至少需要 8 個字元"),
});

/** 表單版：UI 的確認欄比對在這裡，action 只收 changePasswordSchema 的兩欄。 */
export const changePasswordFormSchema = changePasswordSchema
  .extend({
    confirmPassword: z.string().min(8, "確認新密碼長度至少需要 8 個字元"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "兩次輸入的密碼不一致。",
    path: ["confirmPassword"],
  });

/** ADR-0009：缺 key 視為啟用，只有明確的 false 才停用。 */
export function resolveNotificationPreferences(value: unknown): NotificationPreferences {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    ticketStatus: raw.ticket_status !== false,
    newTicket: raw.new_ticket !== false,
  };
}
