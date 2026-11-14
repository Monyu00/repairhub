export function describePasskeyError(error: { code?: string | null; message: string }): string {
  if (error.message === "Browser does not support WebAuthn") {
    return "此裝置或瀏覽器不支援 Passkey。";
  }

  switch (error.code) {
    case "email_not_confirmed":
      return "電子郵件尚未驗證，請先完成驗證。";
    case "too_many_passkeys":
      return "Passkey 數量已達上限。";
    case "passkey_disabled":
      return "系統尚未啟用 Passkey，請改用密碼登入。";
    case "webauthn_challenge_expired":
    case "webauthn_challenge_not_found":
      return "Passkey 驗證請求已過期，請重新操作。";
    case "webauthn_credential_exists":
      return "此裝置的 Passkey 已經註冊。";
    case "webauthn_credential_not_found":
      return "此 Passkey 已失效，請重新註冊。";
    case "webauthn_verification_failed":
      return "Passkey 驗證失敗，請重新操作。";
    case "user_banned":
      return "此帳號已被停用。";
    default:
      return "Passkey 操作失敗，請稍後再試。";
  }
}
