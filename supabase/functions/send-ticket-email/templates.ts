export interface TicketEmailData {
  ticketId: string;
  statusLabel: string;
  categoryName: string;
  location: string;
  updatedAt: string;
  trackingUrl: string;
}

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

export function renderInProgressEmail(data: TicketEmailData): { subject: string; html: string; text: string } {
  const shortId = data.ticketId.slice(0, 8);
  const updatedAt = formatUpdatedAt(data.updatedAt);
  const subject = `【RepairHub】案件 #${shortId} 已開始維修`;
  const categoryName = escapeHtml(data.categoryName);
  const location = escapeHtml(data.location);
  const escapedUpdatedAt = escapeHtml(updatedAt);
  const trackingUrl = escapeHtml(data.trackingUrl);

  const html = `<!doctype html>
<html lang="zh-Hant-TW" dir="ltr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f8fafc;color:#1f2937;font-family:Arial,sans-serif;">
    <div lang="zh-Hant-TW" dir="ltr" style="max-width:600px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
      <h1 style="margin:0 0 20px;font-size:24px;line-height:1.35;color:#111827;">案件已開始維修</h1>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">您好，您的報修案件已由維修人員開始處理。</p>
      <p style="margin:0 0 12px;font-size:16px;line-height:1.7;"><strong>報修單編號：</strong>#${
    escapeHtml(shortId)
  }</p>
      <p style="margin:0 0 12px;font-size:16px;line-height:1.7;"><strong>目前狀態：</strong>${
    escapeHtml(data.statusLabel)
  }</p>
      <p style="margin:0 0 12px;font-size:16px;line-height:1.7;"><strong>報修類別：</strong>${categoryName}</p>
      <p style="margin:0 0 12px;font-size:16px;line-height:1.7;"><strong>地點：</strong>${location}</p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.7;"><strong>更新時間：</strong>${escapedUpdatedAt}</p>
      <a href="${trackingUrl}" style="display:inline-block;min-height:20px;padding:14px 24px;background:#1d4ed8;color:#ffffff;font-size:16px;font-weight:700;line-height:20px;text-decoration:none;border-radius:6px;">查看報修單進度</a>
      <p style="margin:28px 0 0;color:#475569;font-size:14px;line-height:1.6;">此為系統自動發出的通知信，請勿直接回覆。</p>
    </div>
  </body>
</html>`;

  const text = `RepairHub 報修通知

案件已開始維修。

報修單編號：#${shortId}
目前狀態：${data.statusLabel}
報修類別：${data.categoryName}
地點：${data.location}
更新時間：${updatedAt}

查看報修單進度：${data.trackingUrl}

此為系統自動發出的通知信，請勿直接回覆。`;

  return { subject, html, text };
}
