import type { TicketNotificationEvent } from "../_shared/delivery/events.ts";
import {
  type ClaimedDelivery,
  type DeliveryChannel,
  type DeliveryRepository,
  type DeliverySender,
  DeliverySendError,
} from "../_shared/delivery/execution.ts";

const STATUS_LABELS: Record<TicketNotificationEvent, string> = {
  new_ticket: "待處理",
  report_submitted: "待處理",
  in_progress: "處理中",
  completed: "已完成",
  closed: "已結案",
  cancelled: "已取消",
};

export interface ClaimedSocialDelivery extends ClaimedDelivery {
  targetFingerprint: string;
}

export interface TicketSocialDisplayData {
  ticketId: string;
  webhookUrl: string;
  categoryName: string;
  location: string;
  updatedAt: string;
}

export interface DiscordMessage {
  webhookUrl: string;
  content: string;
  allowedMentions: { parse: [] };
}

export type SocialRepository = DeliveryRepository<ClaimedSocialDelivery, TicketSocialDisplayData>;
export type DiscordSender = DeliverySender<DiscordMessage>;

export class DiscordSendError extends DeliverySendError {
  constructor(message: string, options: { retryable: boolean }) {
    super(message, options);
    this.name = "DiscordSendError";
  }
}

export class MissingSocialTargetError extends Error {
  constructor() {
    super("No active social target");
    this.name = "MissingSocialTargetError";
  }
}

function renderDiscordMessage(
  eventType: TicketNotificationEvent,
  ticket: TicketSocialDisplayData,
  trackingUrl: string,
): string {
  return [
    `報修單編號：#${ticket.ticketId.slice(0, 8)}`,
    `狀態：${STATUS_LABELS[eventType]}`,
    `類別：${ticket.categoryName}`,
    `地點：${ticket.location}`,
    `更新時間：${
      new Intl.DateTimeFormat("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "Asia/Taipei",
      }).format(new Date(ticket.updatedAt))
    }`,
    `追蹤連結：${trackingUrl}`,
  ].join("\n");
}

export const socialChannel: DeliveryChannel<ClaimedSocialDelivery, TicketSocialDisplayData, DiscordMessage> = {
  name: "Discord",
  renderError: "Failed to render Discord message",
  validateTarget: () => null,
  readFailure: (error) =>
    error instanceof MissingSocialTargetError
      ? { status: 422, error: "Missing social target", logError: error.message }
      : null,
  buildMessage: (_delivery, ticketData, trackingUrl, eventType) => ({
    webhookUrl: ticketData.webhookUrl,
    content: renderDiscordMessage(eventType, ticketData, trackingUrl),
    allowedMentions: { parse: [] },
  }),
};
