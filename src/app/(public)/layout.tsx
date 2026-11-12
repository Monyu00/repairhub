import type { ReactNode } from "react";

import { APP_CONFIG } from "@/config/app-config";
import { getSession } from "@/server/auth/session";
import { getNotifications } from "@/server/notifications/read";

import { PublicHeader } from "./_components/public-header";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  const notifications = session ? await getNotifications(session.supabase, session.userId) : undefined;

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
      <PublicHeader notifications={notifications} user={user} />
      <main id="main-content" tabIndex={-1} className="flex-1 scroll-mt-14">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:font-medium focus:text-foreground focus:text-sm focus:shadow-md focus:ring-2 focus:ring-ring focus:outline-hidden"
        >
          跳到主要內容
        </a>
        {children}
      </main>
      <footer className="border-border border-t bg-card/50 py-6 text-center text-muted-foreground text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p>{APP_CONFIG.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
