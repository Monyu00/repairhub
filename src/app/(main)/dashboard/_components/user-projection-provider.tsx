"use client";

import type { ReactNode } from "react";

import { UserProjectionContext } from "@/hooks/use-user";
import type { UserProjection } from "@/lib/users/projection";

interface UserProjectionProviderProps {
  projection: UserProjection | null;
  children: ReactNode;
}

export function UserProjectionProvider({ projection, children }: UserProjectionProviderProps) {
  return <UserProjectionContext.Provider value={projection}>{children}</UserProjectionContext.Provider>;
}
