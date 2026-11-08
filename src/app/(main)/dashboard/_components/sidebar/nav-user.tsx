"use client";

import { useState, useTransition } from "react";

import { LogOut, Shield, UserCog } from "lucide-react";

import { PersonalSettingsDialog } from "@/components/personal-settings/personal-settings-dialog";
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
import { getUserRoleLabel } from "@/lib/users/projection";
import { getInitials } from "@/lib/utils";
import { signOutAction } from "@/server/auth/actions";

function firstText(...values: Array<string | null | undefined>) {
  return values.find((value) => value) ?? "";
}

export function NavUser() {
  const { isMobile } = useSidebar();
  const projection = useUser();
  const [isPending, startTransition] = useTransition();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!projection) {
    return null;
  }

  const email = firstText(projection.email);
  const name = firstText(projection.displayName, email ? email.split("@")[0] : undefined, "使用者");
  const avatar = projection.avatarUrl ?? "";
  const roleLabel = getUserRoleLabel(projection.role);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-muted-foreground text-xs">
              <Shield className="size-3.5" />
              <span>身分：{roleLabel}</span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onSelect={() => setSettingsOpen(true)}>
              <UserCog className="mr-2 size-4" />
              個人設定
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await signOutAction();
                });
              }}
              className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="mr-2 size-4" />
              登出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <PersonalSettingsDialog onOpenChange={setSettingsOpen} open={settingsOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
