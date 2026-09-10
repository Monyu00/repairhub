import type { ReactNode } from "react";

import { APP_CONFIG } from "@/config/app-config";
import { getSession } from "@/server/auth/session";

import { PublicHeader } from "./_components/public-header";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  const user = session
    ? {
        userId: session.userId,
        email: session.email,
        role: session.role,
        displayName: session.displayName,
        avatarUrl: session.avatarUrl,
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader user={user} />
      <main className="flex-1">{children}</main>
      <footer className="border-border border-t bg-card/50 py-6 text-center text-muted-foreground text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p>{APP_CONFIG.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
