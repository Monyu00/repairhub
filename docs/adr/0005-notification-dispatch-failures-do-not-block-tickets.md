# Notification dispatch failures must not block Ticket writes

Email notification sending is a durable Postgres queue, not a synchronous requirement of the triggering Ticket write. If the queue cannot dispatch a Delivery, it records the failure for retry and allows the Ticket write to commit. This favors Ticket lifecycle availability over immediate Email delivery while preserving deduplication and retry. This supersedes ADR-0003's Database Webhook transport while retaining its rule that Ticket state changes create notifications from the database.
