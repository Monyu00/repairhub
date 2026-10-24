# Email 通知基礎

Issue #86 建立 `pending -> in_progress` 的 Email tracer。Ticket 狀態由 Postgres trigger 產生 delivery，Edge Function 只接受持有內部 service secret 的呼叫，再透過 Resend 寄送繁中 HTML 與 plain text Email。

Issue #87 加入持久化回收：暫時性寄送失敗會依約五分鐘、十五分鐘、一小時與六小時排定下次嘗試；`pg_cron` 每五分鐘接手 pending、已到期 failed 與逾時卡住的 sending delivery。每筆 delivery 最多五次 claim 嘗試，達上限後保留為 failed。Resend 的永久 4xx 錯誤不會進入持久重試。

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

部署前請先撤銷或輪替舊版 Edge Function 曾使用的 Resend API key，再設定只用於此版本的 `RESEND_API_KEY`。

本機可建立 `supabase/functions/.env`，內容可參考 `supabase/functions/.env.example`。此檔案已加入 `.gitignore`。

## 部署

```bash
npx supabase@2.121.0 login
npx supabase@2.121.0 link --project-ref zgmyabmxxtgzbeplodde
npx supabase@2.121.0 db push
npx supabase@2.121.0 secrets set --env-file supabase/functions/.env --project-ref zgmyabmxxtgzbeplodde
npx supabase@2.121.0 functions deploy send-ticket-email --project-ref zgmyabmxxtgzbeplodde --no-verify-jwt --use-api
```

設定 Resend 前，先在 Resend 驗證 `notify.monyu.dev`，並依 Resend 指示完成 SPF、DKIM 與 DMARC DNS 記錄。`RESEND_REPLY_TO` 必須是可收信的監控信箱。

## 驗證

```bash
npx --yes deno test supabase/functions/tests/send-ticket-email-test.ts
npx --yes deno check --frozen-lockfile supabase/functions/send-ticket-email/index.ts
```

SQL integration smoke check 位於 `supabase/tests/notification_foundation_smoke.sql`。它會建立暫時 fixture、執行檢查後 `ROLLBACK`；只可在 disposable DB 或已確認可安全交易的環境執行。
Retry 行為的 SQL integration smoke check 位於 `supabase/tests/notification_retry_smoke.sql`，同樣會在交易內驗證 claim、attempt limit 與 cron scheduling 後 `ROLLBACK`。
