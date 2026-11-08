# Notification preferences live on the account profile as a flat JSON object

Personal Settings lets an account turn off Ticket status and new Ticket Email without touching the queue itself. The switches are stored as `profiles.notification_preferences`, a flat object of event keys to booleans (`{"ticket_status": true, "new_ticket": true}`), and the existing enqueue functions read it before writing a Delivery.

## Considered Options

A separate `notification_preferences` table costs a migration, RLS policies, and a join in every enqueue function for the same two booleans. Auth `user_metadata` already carries avatar and display name, but data the triggers read belongs on `profiles`, and splitting it there makes the source of truth ambiguous.

## Consequences

- A missing or empty object means enabled, so accounts created before this change keep receiving every Event.
- A disabled Event writes nothing to the Notification Queue, so a missing Delivery no longer implies a transport failure; debugging checks the preference first.
- Deliberately not nested: quiet hours, per-Event frequency, and channels beyond Email are out of scope until an in-app channel exists.
- Account-security Email is always sent and never consults this field.
