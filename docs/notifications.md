# Email 通知基礎

Issue #86 建立 `pending -> in_progress` 的 Email tracer。Ticket 狀態由 Postgres trigger 產生 delivery，Edge Function 只接受持有內部 service secret 的呼叫，再透過 Resend 寄送繁中 HTML 與 plain text Email。

Issue #87 加入持久化回收：暫時性寄送失敗會依約五分鐘、十五分鐘、一小時與六小時排定下次嘗試；`pg_cron` 每五分鐘接手 pending、已到期 failed 與逾時卡住的 sending delivery。每筆 delivery 最多五次 claim 嘗試，達上限後保留為 failed。Resend 的永久 4xx 錯誤不會進入持久重試。

Issue #89 加入 `new_ticket` 事件：Ticket 會在必要資料與報修照片提交完成後設定 `notification_ready_at`，trigger 只對符合 Category、active 且已訂閱的 Technician 建立 delivery，並以 Email 呈現最多 160 字的問題描述摘要，不包含 Reporter 電話或 Email。

## 必要 secrets

在 Supabase Vault 建立下列兩個 secret，兩者都不得寫入 repo：
- `repairhub_project_url`：專案 API URL，例如 `https://<project-ref>.supabase.co`
- `repairhub_edge_function_secret`：DB 呼叫 Edge Function 的隨機內部 secret

Edge Function secrets：
- `REPAIRHUB_EDGE_FUNCTION_SECRET`：必須與 Vault 的 `repairhub_edge_function_secret` 完全相同
- `RESEND_API_KEY`
- `RESEND_FROM`
- `RESEND_REPLY_TO`
- `APP_BASE_URL`

Vault 的值必須是純文字。若以 bytea 存入（`vault.secrets.secret`），`vault.decrypted_secrets` 會是
`\x...` 轉義字串：`repairhub_project_url` 會讓 `net.http_post` 丟 `invalid URL ...: Bad scheme`，
`repairhub_edge_function_secret` 會讓 Edge Function 回 401，兩者都會讓 trigger 中斷 Ticket 寫入。
可用下列語句檢查是否為純文字：

```sql
select name, decrypted_secret like 'https://%' as is_plain_url
from vault.decrypted_secrets where name like 'repairhub%';
```

部署前請先撤銷或輪替舊版 Edge Function 曾使用的 Resend API key，再設定只用於此版本的 `RESEND_API_KEY`。

本機可建立 `supabase/functions/.env`，內容可參考 `supabase/functions/.env.example`。此檔案已加入 `.gitignore`。

## 部署

正式環境請執行互動式 provisioning wizard；它會開啟外部服務頁面、以隱藏輸入收集 secrets、寫入已 gitignore 的 `supabase/functions/.env`，並依序部署 Edge Function、migration 與 cron。

```bash
bash scripts/setup-email-notifications.sh
```

Wizard 會依下列順序處理：

1. 建立 RepairHub 專用的 scoped Supabase access token，並驗證 `notify.monyu.dev` 的 SPF、DKIM 與 DMARC。
2. 建立限制在 `notify.monyu.dev` 的 Resend sending key，設定 Edge Function secrets 與 Supabase Vault。
3. 先部署新版 `send-ticket-email`，再收斂既有 production 的 `pg_net` schema，最後套用 migration 與 retry cron。
4. 以真實可收信地址完成四種通知、重播去重與暫時性失敗 retry 的 E2E。

不要在正式環境使用 `supabase login`，因為瀏覽器登入流程會建立全帳號權限的 token。`SUPABASE_ACCESS_TOKEN` 與資料庫密碼只存在於該次 shell 環境，不會寫入 repo。`RESEND_REPLY_TO` 必須是可收信的監控信箱。

目前四種通知不接收 Resend delivery webhook，這點與 Issue #32 的 out-of-scope 一致；重播去重由 `notification_log` 的 claim 邊界驗證，因此不需要建立沒有 consumer 的 webhook secret。

## Production E2E

Wizard 最後會要求部署者建立一筆真實測試 Ticket，依序確認：

- 符合 Category 的 active Technician 收到 `new_ticket`。
- Reporter 收到 `in_progress`、`completed` 與 `closed`。
- Ledger 的每筆 delivery 都是 `sent`，且 `resend_message_id` 已寫回。
- 重播已寄送的 delivery 不會再產生 Email。
- 模擬一筆暫時性失敗的 delivery 後，retry 路徑可送到 `sent`，或永久失敗會留下可診斷的 terminal state。
- `anon` 與 `authenticated` 無法讀取 `notification_log`，且 Supabase security advisors 沒有新增通知相關 finding。

密碼、API key、webhook secret 與 access token 都不得貼進 issue、PR、commit 或任何 tracked file。

## 驗證

```bash
npx --yes deno test supabase/functions/tests/send-ticket-email-test.ts
npx --yes deno check --frozen-lockfile supabase/functions/send-ticket-email/index.ts
```

SQL integration smoke check 位於 `supabase/tests/notification_foundation_smoke.sql`。它會建立暫時 fixture、執行檢查後 `ROLLBACK`；只可在 disposable DB 或已確認可安全交易的環境執行。
Retry 行為的 SQL integration smoke check 位於 `supabase/tests/notification_retry_smoke.sql`，同樣會在交易內驗證 claim、attempt limit 與 cron scheduling 後 `ROLLBACK`。
新 Ticket 收件人篩選的 SQL integration smoke check 位於 `supabase/tests/new_ticket_notification_smoke.sql`，會在交易內驗證 readiness gate、active/subscribed Technician 篩選與 delivery 去重後 `ROLLBACK`。
