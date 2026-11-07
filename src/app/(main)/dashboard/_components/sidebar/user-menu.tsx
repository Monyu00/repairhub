"use client";

import { useState, useTransition } from "react";

import { LogOut, Shield, UserCog } from "lucide-react";

import { PersonalSettingsDialog } from "@/app/(main)/dashboard/profile/_components/personal-settings-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/use-user";
import { getUserRoleLabel, type UserRole } from "@/lib/users/projection";
import { getInitials } from "@/lib/utils";
import { signOutAction } from "@/server/auth/actions";

interface UserMenuProps {
  user?: {
    email: string;
    name?: string;
    avatarUrl?: string;
    role?: UserRole | null;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const projection = useUser();
  const [isPending, startTransition] = useTransition();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const email = user?.email ?? projection?.email;
  const displayName = [user?.name, projection?.displayName, email?.split("@")[0]].find((value) => value) ?? "";
  const avatarUrl = user?.avatarUrl ?? projection?.avatarUrl;
  const role = user?.role ?? projection?.role ?? null;

  if (!email) {
    return null;
  }

  const roleLabel = getUserRoleLabel(role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg p-1 text-left transition-colors hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="size-8 rounded-lg">
            <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="size-9 rounded-lg">
              <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{displayName}</span>
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

      <PersonalSettingsDialog onOpenChange={setSettingsOpen} open={settingsOpen} />
    </DropdownMenu>
  );
}
