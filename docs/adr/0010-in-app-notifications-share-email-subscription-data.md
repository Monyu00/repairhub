# In-app notifications share the email subscription and preference data

The in-app notification channel for technicians derives recipients from the same data that drives Email: category subscriptions gate new-ticket notifications, and the flat `profiles.notification_preferences` object (ADR-0009) gates event types for both channels with one switch. A ticket status change notifies the technician who claimed or was assigned the ticket, and the DB trigger excludes events where the actor is the recipient.

## Considered Options

A separate in-app preference set doubles the settings UI, the schema, and the technician's mental model for no current use case; a channel-level toggle can be added later without changing event routing.

## Consequences

- Turning off a Notification Preference also silences the matching In-app Notification, not just the Delivery.
- One DB trigger path writes both the Delivery and the In-app Notification, so a missing in-app record and a missing Delivery debug from the same place.
- Per-channel quiet hours or frequency controls need new fields first; the flat preference object deliberately does not anticipate them.
