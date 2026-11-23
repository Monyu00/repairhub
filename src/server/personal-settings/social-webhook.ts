import { createHash } from "node:crypto";

export type SocialWebhookAdapter = {
  recordAttempt: () => Promise<{ rateLimited: boolean }>;
  saveBinding: (input: { enabled: boolean; fingerprint: string; webhookUrl: string }) => Promise<void>;
  setBindingEnabled: (enabled: boolean) => Promise<void>;
  removeBinding: () => Promise<void>;
};

export type SocialWebhookSender = (webhookUrl: string) => Promise<void>;

type SocialWebhookResult = { success: boolean; error?: string };

const DISCORD_WEBHOOK_HOSTS = new Set(["discord.com", "ptb.discord.com", "canary.discord.com"]);
const DISCORD_WEBHOOK_PATH = /^\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/;

export function isDiscordWebhookUrl(webhookUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(webhookUrl);
  } catch {
    return false;
  }

  return (
    url.protocol === "https:" &&
    DISCORD_WEBHOOK_HOSTS.has(url.hostname) &&
    DISCORD_WEBHOOK_PATH.test(url.pathname) &&
    url.search === "" &&
    url.hash === "" &&
    url.username === "" &&
    url.password === ""
  );
}

export async function bindSocialWebhook(
  adapter: SocialWebhookAdapter,
  sender: SocialWebhookSender,
  input: { webhookUrl: string },
): Promise<SocialWebhookResult> {
  if (!isDiscordWebhookUrl(input.webhookUrl)) {
    return { success: false, error: "請輸入有效的 Discord Webhook URL" };
  }

  try {
    const attempt = await adapter.recordAttempt();
    if (attempt.rateLimited) {
      return { success: false, error: "綁定嘗試次數過多，請 15 分鐘後再試" };
    }
  } catch (error) {
    console.error("Failed to record social webhook attempt:", error);
    return { success: false, error: "無法記錄綁定嘗試，請稍後再試" };
  }

  try {
    await sender(input.webhookUrl);
  } catch (error) {
    console.error("Failed to send social webhook test message:", error);
    return { success: false, error: "測試訊息傳送失敗，Webhook 未綁定" };
  }

  try {
    const fingerprint = createHash("sha256").update(input.webhookUrl, "utf8").digest("hex");
    await adapter.saveBinding({ enabled: false, fingerprint, webhookUrl: input.webhookUrl });
    return { success: true };
  } catch (error) {
    console.error("Failed to save social webhook:", error);
    return { success: false, error: "無法儲存 Discord Webhook，請稍後再試" };
  }
}

export async function setSocialWebhookEnabled(
  adapter: SocialWebhookAdapter,
  enabled: boolean,
): Promise<SocialWebhookResult> {
  try {
    await adapter.setBindingEnabled(enabled);
    return { success: true };
  } catch (error) {
    console.error("Failed to update social webhook switch:", error);
    return { success: false, error: "無法更新社交通知開關，請稍後再試" };
  }
}

export async function removeSocialWebhook(adapter: SocialWebhookAdapter): Promise<SocialWebhookResult> {
  try {
    await adapter.removeBinding();
    return { success: true };
  } catch (error) {
    console.error("Failed to remove social webhook:", error);
    return { success: false, error: "無法移除 Discord Webhook，請稍後再試" };
  }
}
