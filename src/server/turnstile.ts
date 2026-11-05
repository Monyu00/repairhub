import { TURNSTILE_ERROR_MESSAGE } from "@/lib/turnstile";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function normalizeTurnstileError(message: string, code?: string): string {
  return code === "captcha_failed" || /captcha|turnstile/i.test(message) ? TURNSTILE_ERROR_MESSAGE : message;
}

export async function verifyTurnstileToken(token: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!token || !secret) {
    return false;
  }

  try {
    const response = await fetcher(SITEVERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret,
        response: token,
      }),
    });
    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as { success?: boolean };

    return data.success === true;
  } catch {
    return false;
  }
}
