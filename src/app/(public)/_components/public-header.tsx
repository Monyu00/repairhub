import Link from "next/link";

import { LayoutDashboard, User, Wrench } from "lucide-react";

import { ThemeSwitcher } from "@/app/(main)/dashboard/_components/sidebar/theme-switcher";
import { UserMenu } from "@/app/(main)/dashboard/_components/sidebar/user-menu";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/users/projection";

interface PublicHeaderProps {
  user: {
    userId: string;
    email: string;
    role: UserRole | null;
    displayName: string | null;
    avatarUrl?: string;
  } | null;
}

export function PublicHeader({ user }: PublicHeaderProps) {
  const isStaff = user?.role === "admin" || user?.role === "technician";
  const displayName = user?.displayName ?? (user?.email ? user.email.split("@")[0] : "");

  return (
    <header className="sticky top-0 z-40 w-full border-border border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Wrench className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold font-heading text-foreground text-lg leading-tight tracking-tight">
              RepairHub
            </span>
            <span className="hidden text-muted-foreground text-xs leading-none sm:inline">校園維修通報系統</span>
          </div>
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin / Technician Backstage Entrance */}
          {isStaff && (
            <Button asChild variant="ghost" size="sm" className="h-10 w-10 p-0 sm:h-7 sm:w-auto sm:gap-1.5 sm:px-2.5">
              <Link href="/dashboard">
                <span className="sr-only sm:not-sr-only">管理後台</span>
                <LayoutDashboard data-icon="inline-end" />
              </Link>
            </Button>
          )}

          {/* User Section */}
          {user ? (
            <UserMenu
              user={{
                email: user.email,
                name: displayName,
                avatarUrl: user.avatarUrl,
                role: user.role,
              }}
            />
          ) : (
            <Button asChild variant="outline" size="sm" className="h-11 gap-1 px-3 sm:h-7 sm:px-2.5">
              <Link href="/login">
                <User className="size-4" />
                <span>登入</span>
              </Link>
            </Button>
          )}

          {/* Theme switcher */}
          <ThemeSwitcher className="size-10 sm:size-8" />
        </div>
      </div>
    </header>
  );
}
