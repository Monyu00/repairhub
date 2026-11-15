const APP_TIME_ZONE = "Asia/Taipei";

const ticketDateFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: APP_TIME_ZONE,
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const mediumDateTimeFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: APP_TIME_ZONE,
  dateStyle: "medium",
  timeStyle: "short",
});

const shortDateFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: APP_TIME_ZONE,
  month: "numeric",
  day: "numeric",
});

const applicationDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const compactDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

function getFormattedPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

function parseDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  const parsed = typeof date === "string" ? new Date(date) : date;
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

type TicketLocation = {
  building: {
    name: string;
    code: string;
  };
  space: {
    name: string;
    floor: number;
  } | null;
};

export function formatTicketLocation(
  ticket: TicketLocation,
  options: { includeCode?: boolean; includeFloor?: boolean } = {},
): string {
  const buildingName =
    options.includeCode && ticket.building.code
      ? `${ticket.building.name} (${ticket.building.code})`
      : ticket.building.name;

  if (!ticket.space) {
    return buildingName;
  }

  const spaceName =
    options.includeFloor && typeof ticket.space.floor === "number"
      ? `${ticket.space.name} (${ticket.space.floor}F)`
      : ticket.space.name;
  return `${buildingName} - ${spaceName}`;
}

/**
 * Formats a date string or Date object into "yyyy/MM/dd HH:mm" with Traditional Chinese locale.
 * Returns "-" if the input is null, undefined, or invalid.
 */
export function formatTicketDate(date: string | Date | null | undefined): string {
  const parsed = parseDate(date);
  if (!parsed) return "-";

  const parts = ticketDateFormatter.formatToParts(parsed);
  return `${getFormattedPart(parts, "year")}/${getFormattedPart(parts, "month")}/${getFormattedPart(parts, "day")} ${getFormattedPart(parts, "hour")}:${getFormattedPart(parts, "minute")}`;
}

export function formatShortDateTime(date: string | Date | null | undefined): string {
  const parsed = parseDate(date);
  if (!parsed) return "-";

  const parts = shortDateTimeFormatter.formatToParts(parsed);
  return `${getFormattedPart(parts, "month")}/${getFormattedPart(parts, "day")} ${getFormattedPart(parts, "hour")}:${getFormattedPart(parts, "minute")}`;
}

export function formatMediumDateTime(date: string | Date | null | undefined): string {
  const parsed = parseDate(date);
  if (!parsed) return "-";

  return mediumDateTimeFormatter.format(parsed);
}

export function getApplicationDateKey(date = new Date()): string {
  return applicationDateFormatter.format(date);
}

export function formatCompactDate(date: string | Date | null | undefined): string {
  const parsed = parseDate(date);
  if (!parsed) return "-";

  return compactDateFormatter.format(parsed).replace(/-/g, "");
}

export function formatMonthDay(date: string | Date | null | undefined): string {
  const parsed = parseDate(date);
  if (!parsed) return "-";

  const parts = shortDateFormatter.formatToParts(parsed);
  return `${getFormattedPart(parts, "month")}/${getFormattedPart(parts, "day")}`;
}

export function formatDateOnly(date: string | Date | null | undefined): string {
  const parsed = parseDate(date);
  if (!parsed) return "-";

  const parts = dateFormatter.formatToParts(parsed);
  return `${getFormattedPart(parts, "year")}/${getFormattedPart(parts, "month")}/${getFormattedPart(parts, "day")}`;
}
