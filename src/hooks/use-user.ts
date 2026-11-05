"use client";

import { createContext, useContext } from "react";

import type { UserProjection } from "@/lib/users/projection";

export const UserProjectionContext = createContext<UserProjection | null>(null);

export function useUser(): UserProjection | null {
  return useContext(UserProjectionContext);
}
