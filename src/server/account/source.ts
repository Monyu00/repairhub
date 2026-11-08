import { resolveUserProjection, type UserProjection } from "@/lib/users/projection";

export interface AccountSource {
  user: Parameters<typeof resolveUserProjection>[0];
  profile?: (Parameters<typeof resolveUserProjection>[1] & { notification_preferences?: unknown }) | null;
}

export function mapAccountSource(source: AccountSource): UserProjection | null {
  if (!source.user || !source.profile) return null;
  return resolveUserProjection(source.user, source.profile);
}
