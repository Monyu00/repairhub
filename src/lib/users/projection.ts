import type { Database } from "@/lib/supabase/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export interface UserProjection {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole | null;
  department: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (value) return value;
  }
  return null;
}

interface UserMetadata {
  full_name?: string | null;
  name?: string | null;
  display_name?: string | null;
  department?: string | null;
  phone?: string | null;
  user_role?: UserRole | null;
  avatar_url?: string | null;
}

interface AuthUser {
  id: string;
  email?: string | null;
  user_metadata?: UserMetadata | null;
}

interface Profile {
  display_name?: string | null;
  department?: string | null;
  phone?: string | null;
  user_role?: UserRole | null;
  is_active?: boolean | null;
}

export function resolveUserProjection(authUser: AuthUser, profile?: Profile | null): UserProjection {
  const metadata = authUser.user_metadata;
  const metadataDisplayName = firstNonEmpty(metadata?.full_name, metadata?.name, metadata?.display_name);

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    displayName: profile?.display_name ?? metadataDisplayName,
    role: profile?.user_role ?? metadata?.user_role ?? null,
    department: profile?.department ?? metadata?.department ?? null,
    phone: profile?.phone ?? metadata?.phone ?? null,
    avatarUrl: metadata?.avatar_url ?? null,
    isActive: profile?.is_active ?? true,
  };
}

function roleRanking(role: UserRole | null): number {
  if (role === "admin") return 0;
  if (role === "technician") return 1;
  return 2;
}

export function compareUserRole(a: UserRole | null, b: UserRole | null): number {
  return roleRanking(a) - roleRanking(b);
}

export function compareUserProjection(a: UserProjection, b: UserProjection): number {
  if (a.isActive !== b.isActive) {
    return a.isActive ? -1 : 1;
  }

  const roleDifference = compareUserRole(a.role, b.role);
  if (roleDifference !== 0) {
    return roleDifference;
  }

  return a.email.localeCompare(b.email);
}
