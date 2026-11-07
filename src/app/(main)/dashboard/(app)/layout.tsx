import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { getSession } from "@/server/auth/session";

// Back-office screens: only admin/technician accounts, and accounts that still
// owe a password change are bounced to /change-password. /dashboard/profile sits
// outside this group on purpose so those accounts can reach Personal Settings.
export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getSession();

  if (!session || (session.role !== "admin" && session.role !== "technician")) {
    redirect("/");
  }

  if (session.mustChangePassword) {
    redirect("/change-password");
  }

  return <>{children}</>;
}
