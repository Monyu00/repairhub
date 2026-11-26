export const TICKET_NOTIFICATION_EVENTS = [
  "new_ticket",
  "report_submitted",
  "in_progress",
  "completed",
  "closed",
  "cancelled",
] as const;

export type TicketNotificationEvent = (typeof TICKET_NOTIFICATION_EVENTS)[number];

export function isTicketNotificationEvent(value: string): value is TicketNotificationEvent {
  return (TICKET_NOTIFICATION_EVENTS as readonly string[]).includes(value);
}
