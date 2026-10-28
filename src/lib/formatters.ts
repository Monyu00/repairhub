import { format } from "date-fns";
import { zhTW } from "date-fns/locale/zh-TW";

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
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "-";
  return format(d, "yyyy/MM/dd HH:mm", { locale: zhTW });
}
