import { format } from "date-fns";
import { zhTW } from "date-fns/locale/zh-TW";

/**
 * Formats a date string or Date object into "yyyy/MM/dd HH:mm" with Traditional Chinese locale.
 * Returns "-" if the input is null, undefined, or invalid.
 */
export function formatTicketDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "-";
  return format(d, "yyyy/MM/dd HH:mm", { locale: zhTW });
}
