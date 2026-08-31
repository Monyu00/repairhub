"use client";

import { useTransition } from "react";

import { LogOut, Shield } from "lucide-react";

import { signOutAction } from "@/app/(external)/login/_actions/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useUser } from "@/hooks/use-user";
import { getInitials } from "@/lib/utils";
import type { UserRole } from "@/navigation/sidebar/sidebar-items";

interface NavUserProps {
  user?: {
    readonly name?: string;
    readonly email?: string;
    readonly avatar?: string;
  };
  userRole?: UserRole | null;
}

function getRoleLabel(role?: UserRole | null) {
  if (role === "admin") return "系統管理員 (Admin)";
  if (role === "technician") return "維修技師 (Technician)";
  return "一般使用者";
}

export function NavUser({ user: propUser, userRole: propRole }: NavUserProps) {
  const { isMobile } = useSidebar();
  const { user: authUser, profile } = useUser();
  const [isPending, startTransition] = useTransition();

  const email = authUser?.email ?? propUser?.email ?? "";
  const name =
    (authUser?.user_metadata?.full_name as string | undefined) ??
    (authUser?.user_metadata?.name as string | undefined) ??
    propUser?.name ??
    (email ? email.split("@")[0] : undefined) ??
    "使用者";

  const avatar = (authUser?.user_metadata?.avatar_url as string | undefined) ?? propUser?.avatar ?? "";

  const effectiveRole = profile?.user_role ?? propRole;
  const roleLabel = getRoleLabel(effectiveRole);

  if (!email && !authUser) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatar || undefined} alt={name} />
                <AvatarFallback className="rounded-lg">{getInitials(name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-muted-foreground text-xs">{email}</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatar || undefined} alt={name} />
                  <AvatarFallback className="rounded-lg">{getInitials(name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-muted-foreground text-xs">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="size-3.5" />
              <span>身分：{roleLabel}</span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await signOutAction();
                });
              }}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 size-4" />
              登出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
