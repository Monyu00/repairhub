/**
 * 驗證 Email 是否屬於南臺科技大學網域 (stust.edu.tw 或其子網域如 student.stust.edu.tw)
 */
export function isAllowedEmailDomain(email: string): boolean {
  if (!email.includes("@")) {
    return false;
  }

  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) {
    return false;
  }

  const domain = parts[1];
  return domain === "stust.edu.tw" || domain.endsWith(".stust.edu.tw");
}
