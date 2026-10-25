export interface TicketEmailData {
  ticketId: string;
  statusLabel: string;
  categoryName: string;
  description: string;
  location: string;
  updatedAt: string;
  trackingUrl: string;
}

export type TicketNotificationEvent = "new_ticket" | "in_progress" | "completed" | "closed";

export function ticketStatusLabel(eventType: string): string {
  switch (eventType) {
    case "new_ticket":
      return "待處理";
    case "in_progress":
      return "維修中";
    case "completed":
      return "已完工";
    case "closed":
      return "已結案";
    default:
      return "未知狀態";
  }
}

const TICKET_EMAIL_COPY: Record<
  TicketNotificationEvent,
  {
    subject: (shortId: string, categoryName: string) => string;
    heading: string;
    intro: string;
    guidance?: string;
  }
> = {
  new_ticket: {
    subject: (shortId, categoryName) => `【RepairHub】新報修案件 #${shortId}：${categoryName}`,
    heading: "新報修案件需要處理",
    intro: "您好，有新的報修案件符合您訂閱的類別。",
  },
  in_progress: {
    subject: (shortId) => `【RepairHub】案件 #${shortId} 已開始維修`,
    heading: "案件已開始維修",
    intro: "您好，您的報修案件已由維修人員開始處理。",
  },
  completed: {
    subject: (shortId) => `【RepairHub】案件 #${shortId} 已完工，請確認`,
    heading: "案件已完工，請確認修復結果",
    intro: "您好，您的報修案件已完工，請前往案件頁確認修復結果。",
    guidance: "若您在 7 天內未確認修復結果，系統將自動結案。",
  },
  closed: {
    subject: (shortId) => `【RepairHub】案件 #${shortId} 已結案`,
    heading: "案件已結案",
    intro: "您好，您的報修案件已完成並結案。",
  },
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function summarizeDescription(value: string): string {
  const characters = Array.from(value.trim());
  if (characters.length <= 160) {
    return characters.join("");
  }

  return `${characters.slice(0, 157).join("")}...`;
}

export function renderTicketEmail(
  data: TicketEmailData,
  eventType: TicketNotificationEvent,
): { subject: string; html: string; text: string } {
  const shortId = data.ticketId.slice(0, 8);
  const updatedAt = formatUpdatedAt(data.updatedAt);
  const copy = TICKET_EMAIL_COPY[eventType];
  const subject = copy.subject(shortId, data.categoryName);
  const categoryName = escapeHtml(data.categoryName);
  const descriptionSummary = eventType === "new_ticket" ? summarizeDescription(data.description) : "";
  const descriptionHtml = descriptionSummary
    ? `<p style="margin:0 0 12px;font-size:16px;line-height:1.7;"><strong>問題描述：</strong>${
      escapeHtml(descriptionSummary)
    }</p>`
    : "";
  const location = escapeHtml(data.location);
  const escapedUpdatedAt = escapeHtml(updatedAt);
  const trackingUrl = escapeHtml(data.trackingUrl);
  const guidance = copy.guidance
    ? `<p style="margin:0 0 24px;font-size:16px;line-height:1.7;"><strong>${escapeHtml(copy.guidance)}</strong></p>`
    : "";

  const html = `<!doctype html>
<html lang="zh-Hant-TW" dir="ltr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f8fafc;color:#1f2937;font-family:Arial,sans-serif;">
    <div lang="zh-Hant-TW" dir="ltr" style="max-width:600px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
      <h1 style="margin:0 0 20px;font-size:24px;line-height:1.35;color:#111827;">${escapeHtml(copy.heading)}</h1>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">${escapeHtml(copy.intro)}</p>
      <p style="margin:0 0 12px;font-size:16px;line-height:1.7;"><strong>報修單編號：</strong>#${
    escapeHtml(shortId)
  }</p>
      <p style="margin:0 0 12px;font-size:16px;line-height:1.7;"><strong>目前狀態：</strong>${
    escapeHtml(data.statusLabel)
  }</p>
      <p style="margin:0 0 12px;font-size:16px;line-height:1.7;"><strong>報修類別：</strong>${categoryName}</p>
      ${descriptionHtml}
      <p style="margin:0 0 12px;font-size:16px;line-height:1.7;"><strong>地點：</strong>${location}</p>
      <p style="margin:0 0 12px;font-size:16px;line-height:1.7;"><strong>更新時間：</strong>${escapedUpdatedAt}</p>
      ${guidance}
      <a href="${trackingUrl}" style="display:inline-block;min-height:20px;padding:14px 24px;background:#1d4ed8;color:#ffffff;font-size:16px;font-weight:700;line-height:20px;text-decoration:none;border-radius:6px;">查看報修單進度</a>
      <p style="margin:28px 0 0;color:#475569;font-size:14px;line-height:1.6;">此為系統自動發出的通知信，請勿直接回覆。</p>
    </div>
  </body>
</html>`;

  const text = `RepairHub 報修通知

${copy.heading}

${copy.intro}
${copy.guidance ?? ""}

報修單編號：#${shortId}
目前狀態：${data.statusLabel}
報修類別：${data.categoryName}
${descriptionSummary ? `問題描述：${descriptionSummary}\n` : ""}地點：${data.location}
更新時間：${updatedAt}

查看報修單進度：${data.trackingUrl}

此為系統自動發出的通知信，請勿直接回覆。`;

  return { subject, html, text };
}
