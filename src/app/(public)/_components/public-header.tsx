"use client";

import { useTransition } from "react";

import Link from "next/link";

import { FileText, LayoutDashboard, LogOut, Shield, User, Wrench } from "lucide-react";

import { ThemeSwitcher } from "@/app/(main)/dashboard/_components/sidebar/theme-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import { signOutAction } from "@/server/auth/actions";

interface PublicHeaderProps {
  user: {
    userId: string;
    email: string;
    role: "admin" | "technician" | "user" | null;
    displayName: string | null;
    avatarUrl?: string;
  } | null;
}

function getRoleLabel(role?: string | null) {
  if (role === "admin") return "系統管理員";
  if (role === "technician") return "維修技師";
  return "校園成員";
}

export function PublicHeader({ user }: PublicHeaderProps) {
  const [isPending, startTransition] = useTransition();

  const isStaff = user?.role === "admin" || user?.role === "technician";
  const displayName = user?.displayName ?? (user?.email ? user.email.split("@")[0] : "");

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

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
            <span className="hidden text-[10px] text-muted-foreground leading-none sm:inline">校園報修通報系統</span>
          </div>
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin / Technician Backstage Entrance */}
          {isStaff && (
            <Button asChild variant="outline" size="sm" className="hidden gap-1.5 sm:inline-flex">
              <Link href="/dashboard">
                <LayoutDashboard className="size-4 text-primary" />
                <span>管理後台</span>
              </Link>
            </Button>
          )}

          {/* User Section */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full p-0.5 transition-opacity hover:opacity-80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar className="size-8">
                    <AvatarImage src={user.avatarUrl} alt={displayName} />
                    <AvatarFallback className="text-xs">{getInitials(displayName)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2.5 px-3 py-2 text-left">
                    <Avatar className="size-9">
                      <AvatarImage src={user.avatarUrl} alt={displayName} />
                      <AvatarFallback className="text-xs">{getInitials(displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground text-sm">{displayName}</p>
                      <p className="truncate text-muted-foreground text-xs">{user.email}</p>
                      <Badge variant="secondary" className="mt-1 gap-1 px-1.5 py-0 font-normal text-[10px]">
                        <Shield className="size-2.5 text-primary" />
                        {getRoleLabel(user.role)}
                      </Badge>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Staff management link on mobile / dropdown */}
                {isStaff && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer gap-2">
                      <LayoutDashboard className="size-4 text-primary" />
                      <span>管理後台</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem asChild>
                  <Link href="/?tab=my-tickets" className="cursor-pointer gap-2">
                    <FileText className="size-4" />
                    <span>我的報修紀錄</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  disabled={isPending}
                  onClick={handleSignOut}
                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  <span>{isPending ? "登出中..." : "登出"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link href="/login">
                <User className="size-4" />
                <span>登入</span>
              </Link>
            </Button>
          )}

          {/* Theme switcher */}
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
