# Email notifications triggered by database webhook, not application code

Status-change notifications (Phase 2) will be triggered by a Supabase Database Webhook on the `tickets` table, invoking a Supabase Edge Function that calls the Resend API. The alternative — triggering from Next.js API routes — was rejected because notifications should be coupled to state changes, not to specific UI flows. A direct database update by an admin (e.g., bulk status change) would silently skip notifications if they were only wired through the frontend.

## Consequences

- The Edge Function must be idempotent — database webhooks can retry on failure.
- Phase 1 does not implement notifications, but the `reporter_email` field is present from day one to support Phase 2 without schema changes.
