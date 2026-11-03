export type ParsedRole = "admin" | "technician" | null | false;

export function parseRole(value: string | undefined): ParsedRole {
  const role = value?.trim().toLowerCase();
  if (!role || role === "user") return null;
  if (role === "admin" || role === "technician") return role;
  return false;
}

export function parseIsoDate(value: string | undefined): string | null | false {
  const date = value?.trim();
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const parsed = new Date(`${date}T00:00:00Z`);
  const [year, month, day] = date.split("-").map(Number);
  const isRealDate =
    !Number.isNaN(parsed.getTime()) &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day;

  return isRealDate ? date : false;
}
