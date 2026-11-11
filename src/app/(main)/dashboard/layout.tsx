import type { ReactNode } from "react";

import { cookies } from "next/headers";
import Link from "next/link";

import { Home } from "lucide-react";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { UserProjectionProvider } from "@/app/(main)/dashboard/_components/user-projection-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { UserProjection } from "@/lib/users/projection";
import { cn } from "@/lib/utils";
import { requireDashboardAccess } from "@/server/auth/session";
import { getTechnicianNotifications } from "@/server/notifications/read";
import { getPreference } from "@/server/server-actions";

import { LayoutControls } from "./_components/sidebar/layout-controls";
import { SearchDialog } from "./_components/sidebar/search-dialog";
import { ThemeSwitcher } from "./_components/sidebar/theme-switcher";
import { UserMenu } from "./_components/sidebar/user-menu";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  const [variant, collapsible, session] = await Promise.all([
    getPreference("sidebar_variant"),
    getPreference("sidebar_collapsible"),
    requireDashboardAccess(),
  ]);

  const projection: UserProjection = {
    id: session.userId,
    email: session.email,
    displayName: session.displayName,
    role: session.role,
    department: session.department,
    phone: session.phone,
    avatarUrl: session.avatarUrl ?? null,
    isActive: session.isActive,
    mustChangePassword: session.mustChangePassword,
  };

  const notifications =
    session.role === "technician" ? await getTechnicianNotifications(session.supabase, session.userId) : undefined;

  return (
    <UserProjectionProvider projection={projection}>
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 68)",
          } as React.CSSProperties
        }
      >
        <AppSidebar notifications={notifications} variant={variant} collapsible={collapsible} />
        <SidebarInset
          id="main-content"
          tabIndex={-1}
          className={cn(
            "[html[data-content-layout=centered]_&>*]:mx-auto",
            "[html[data-content-layout=centered]_&>*]:w-full",
            "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
            "peer-data-[variant=inset]:border",
            "[--dashboard-header-height:--spacing(12)]",
            "min-w-0 overflow-x-clip",
          )}
        >
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:font-medium focus:text-foreground focus:text-sm focus:shadow-md focus:ring-2 focus:ring-ring focus:outline-hidden"
          >
            跳到主要內容
          </a>
          <header
            className={cn(
              "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
              // Handle sticky navbar style with conditional classes so blur, background, z-index, and rounded corners remain consistent across all SidebarVariant layouts.
              "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:backdrop-blur-md",
            )}
          >
            <div className="flex w-full items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-1 lg:gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
                />
                <SearchDialog />
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="gap-1.5">
                  <Link href="/">
                    <span className="sr-only">前台首頁</span>
                    <Home className="size-4" />
                    <span aria-hidden="true" className="hidden sm:inline">
                      前台首頁
                    </span>
                  </Link>
                </Button>
                <UserMenu />
                <ThemeSwitcher />
                <LayoutControls />
              </div>
            </div>
          </header>
          {/* Pages can set data-content-padding="false" to render full-bleed app layouts. */}
          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 has-data-[content-padding=false]:p-0 md:p-6 md:has-data-[content-padding=false]:p-0">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </UserProjectionProvider>
  );
}
