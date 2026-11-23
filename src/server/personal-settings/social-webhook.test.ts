import assert from "node:assert/strict";
import test from "node:test";

import {
  bindSocialWebhook,
  removeSocialWebhook,
  setSocialWebhookEnabled,
  type SocialWebhookAdapter,
} from "./social-webhook";

const FAKE_WEBHOOK_URL = "https://discord.com/api/webhooks/123/fake-token";
const FAKE_FINGERPRINT = "a7d0e51dde9176ce4853b120c6711ccc99218932a4e0b42066ae715978daaaf9";

function createAdapter(options: {
  attemptError?: Error;
  saveError?: Error;
  switchError?: Error;
  removeError?: Error;
} = {}) {
  const state = {
    attempts: 0,
    sentMessages: [] as string[],
    savedBinding: null as { enabled: boolean; fingerprint: string; webhookUrl: string } | null,
    switchValue: null as boolean | null,
    removed: false,
  };

  const adapter = {
    async recordAttempt() {
      if (options.attemptError) throw options.attemptError;
      if (state.attempts >= 5) return { rateLimited: true };
      state.attempts += 1;
      return { rateLimited: false };
    },
    async saveBinding(input: { enabled: boolean; fingerprint: string; webhookUrl: string }) {
      if (options.saveError) throw options.saveError;
      state.savedBinding = input;
    },
    async setBindingEnabled(enabled: boolean) {
      if (options.switchError) throw options.switchError;
      state.switchValue = enabled;
    },
    async removeBinding() {
      if (options.removeError) throw options.removeError;
      state.removed = true;
    },
  } satisfies SocialWebhookAdapter;

  return {
    adapter,
    sender: async (webhookUrl: string) => {
      state.sentMessages.push(webhookUrl);
    },
    state,
  };
}

test("binds a valid webhook only after a successful test message and stores its fingerprint", async () => {
  const { adapter, sender, state } = createAdapter();

  const result = await bindSocialWebhook(adapter, sender, { webhookUrl: FAKE_WEBHOOK_URL });

  assert.deepEqual(result, { success: true });
  assert.equal(state.attempts, 1);
  assert.deepEqual(state.sentMessages, [FAKE_WEBHOOK_URL]);
  assert.deepEqual(state.savedBinding, {
    enabled: false,
    fingerprint: FAKE_FINGERPRINT,
    webhookUrl: FAKE_WEBHOOK_URL,
  });
});

test("replaces an existing webhook after a successful test message", async () => {
  const { adapter, sender, state } = createAdapter();
  const replacement = "https://ptb.discord.com/api/webhooks/456/replacement-token";

  const result = await bindSocialWebhook(adapter, sender, { webhookUrl: replacement });

  assert.deepEqual(result, { success: true });
  assert.deepEqual(state.savedBinding, {
    enabled: false,
    fingerprint: "0c94aa8cf3019c27a1576ff0fa6df40b51510a5cf9b4868544b90eaad4d5abdf",
    webhookUrl: replacement,
  });
});

test("does not save a webhook when the test message fails", async () => {
  const { adapter, state } = createAdapter();
  const failingSender = async () => {
    throw new Error("Discord rejected the test message");
  };

  const result = await bindSocialWebhook(adapter, failingSender, { webhookUrl: FAKE_WEBHOOK_URL });

  assert.deepEqual(result, { success: false, error: "測試訊息傳送失敗，Webhook 未綁定" });
  assert.equal(state.attempts, 1);
  assert.equal(state.savedBinding, null);
});

test("rejects URLs outside the Discord HTTPS webhook allowlist without sending", async () => {
  const invalidUrls = [
    "http://discord.com/api/webhooks/123/fake-token",
    "https://example.com/api/webhooks/123/fake-token",
    "https://discord.com/api/webhooks/not-an-id/fake-token",
    "https://discord.com/api/webhooks/123/fake-token/extra",
    "https://discord.com/api/webhooks/123/fake-token/",
    "https://discord.com/api/webhooks/123/fake-token?wait=true",
    "https://discord.com/api/webhooks/123/fake-token#anchor",
    "https://discord.com/api/webhooks/123/fake-token@evil.example",
  ];

  for (const webhookUrl of invalidUrls) {
    const { adapter, state } = createAdapter();
    const result = await bindSocialWebhook(adapter, async () => {}, { webhookUrl });

    assert.deepEqual(result, { success: false, error: "請輸入有效的 Discord Webhook URL" }, webhookUrl);
    assert.equal(state.attempts, 0);
    assert.deepEqual(state.sentMessages, []);
    assert.equal(state.savedBinding, null);
  }
});

test("rejects the sixth binding attempt within the rate-limit window", async () => {
  const { adapter, sender, state } = createAdapter();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.deepEqual(await bindSocialWebhook(adapter, sender, { webhookUrl: FAKE_WEBHOOK_URL }), {
      success: true,
    });
  }

  const blocked = await bindSocialWebhook(adapter, sender, { webhookUrl: FAKE_WEBHOOK_URL });

  assert.deepEqual(blocked, { success: false, error: "綁定嘗試次數過多，請 15 分鐘後再試" });
  assert.equal(state.attempts, 5);
  assert.equal(state.savedBinding?.enabled, false);
});

test("removes a webhook", async () => {
  const { adapter, state } = createAdapter();

  const result = await removeSocialWebhook(adapter);

  assert.deepEqual(result, { success: true });
  assert.equal(state.removed, true);
});

test("updates the social switch only through the adapter", async () => {
  const { adapter, state } = createAdapter();

  assert.deepEqual(await setSocialWebhookEnabled(adapter, true), { success: true });
  assert.equal(state.switchValue, true);
});

test("maps storage failures to a generic error", async () => {
  const { adapter, sender } = createAdapter({ saveError: new Error("database unavailable") });

  const result = await bindSocialWebhook(adapter, sender, { webhookUrl: FAKE_WEBHOOK_URL });

  assert.deepEqual(result, { success: false, error: "無法儲存 Discord Webhook，請稍後再試" });
});

test("maps switch failures to a generic error", async () => {
  const { adapter } = createAdapter({ switchError: new Error("database unavailable") });

  assert.deepEqual(await setSocialWebhookEnabled(adapter, true), {
    success: false,
    error: "無法更新社交通知開關，請稍後再試",
  });
});

test("maps removal failures to a generic error", async () => {
  const { adapter } = createAdapter({ removeError: new Error("database unavailable") });

  assert.deepEqual(await removeSocialWebhook(adapter), {
    success: false,
    error: "無法移除 Discord Webhook，請稍後再試",
  });
});
