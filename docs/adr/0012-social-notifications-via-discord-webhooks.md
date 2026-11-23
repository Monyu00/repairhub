# Social Notifications use Account-bound Discord Webhooks

Ticket notifications gain a private Social Notification channel through a Discord Webhook bound to a logged-in Account. The existing Notification Queue is generalized with a channel and target fingerprint so Email and Social Notifications share the same event eligibility, durable queue, retry policy, and cron; a separate Edge Function renders and sends the Discord message.

## Considered Options

A separate social queue would duplicate claim, retry, and failure handling. Public social posts were rejected because Ticket events can expose operational details. An OAuth social login flow was rejected because the smallest viable target is a user-supplied, test-verified Discord Webhook.

## Consequences

- The Notification Queue records its channel and an irreversible target fingerprint. Email rows keep their existing recipient semantics; Social rows represent one Ticket event plus one private Discord target, not one Account.
- `social_webhooks` stores at most one Webhook per Account as service-only data, together with the target fingerprint. Several Accounts may bind the same Target. At send time, the Social Edge Function resolves an active Account whose Webhook is enabled, whose event preference is enabled, and whose target fingerprint matches the queued Delivery.
- Saving a Webhook requires a successful Discord test POST, HTTPS Discord webhook validation, and per-Account rate limiting; the URL is never read by ordinary account or admin surfaces.
- Social recipients mirror In-app Notification recipients: active Admins and subscribed active Technicians for new Tickets, plus the assigned Technician and logged-in Reporter for status changes; the actor is excluded.
- The existing `ticketStatus`/`newTicket` Notification Preferences still gate events, while a default-off Social Notification Switch gates only this channel.
- Discord messages use plain text without Reporter contact details or full descriptions, and disable all `@here`, `@everyone`, and user mentions.
- Binding attempts use a service-only fixed 15-minute window with a maximum of five attempts per Account, enforced by an atomic SQL RPC.
- Discord 429/5xx and network failures retry through the existing queue policy; other 4xx responses are terminal. Because Discord Webhooks do not provide an idempotency key, a request that succeeds before the queue can record success may be replayed as a duplicate.
- Production rollout applies the queue migration first, then deploys `send-ticket-social`, and finally merges the UI. The queue cannot create Social Deliveries until users can bind a Webhook, so this order avoids calls to a missing Edge Function.
