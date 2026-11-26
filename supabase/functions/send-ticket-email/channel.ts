import {
  type ClaimedDelivery,
  type DeliveryChannel,
  type DeliveryRepository,
  DeliverySendError,
} from "../_shared/delivery/execution.ts";
import { renderTicketEmail, type TicketEmailData } from "./templates.ts";

export interface ClaimedEmailDelivery extends ClaimedDelivery {
  recipientEmail: string;
}

export type TicketEmailDisplayData = Omit<TicketEmailData, "trackingUrl">;

export interface EmailMessage {
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}

export type EmailRepository = DeliveryRepository<ClaimedEmailDelivery, TicketEmailDisplayData>;

export class EmailSendError extends DeliverySendError {
  constructor(message: string, options: { retryable: boolean }) {
    super(message, options);
    this.name = "EmailSendError";
  }
}

function isValidRecipientEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function createEmailChannel(
  options: { from: string; replyTo: string },
): DeliveryChannel<ClaimedEmailDelivery, TicketEmailDisplayData, EmailMessage> {
  return {
    name: "Email",
    renderError: "Failed to render Email",
    validateTarget: (delivery) =>
      isValidRecipientEmail(delivery.recipientEmail) ? null : { status: 422, error: "Invalid recipient Email" },
    readFailure: () => null,
    buildMessage: (delivery, ticketData, trackingUrl, eventType) => ({
      from: options.from,
      replyTo: options.replyTo,
      to: delivery.recipientEmail,
      ...renderTicketEmail({ ...ticketData, trackingUrl }, eventType),
      idempotencyKey: `repairhub:${delivery.eventKey}`,
    }),
  };
}
