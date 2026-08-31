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
import { getInitials } from "@/lib/utils";

interface UserMenuProps {
  user: {
    email: string;
    name?: string;
    avatarUrl?: string;
    role?: "admin" | "technician" | null;
  };
}

function getRoleLabel(role?: "admin" | "technician" | null) {
  if (role === "admin") return "系統管理員 (Admin)";
  if (role === "technician") return "維修技師 (Technician)";
  return "一般使用者";
}

export function UserMenu({ user }: UserMenuProps) {
  const [isPending, startTransition] = useTransition();

  const displayName = user.name ?? user.email.split("@")[0];
  const roleLabel = getRoleLabel(user.role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg p-1 text-left transition-colors hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="size-8 rounded-lg">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={displayName} />
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="size-9 rounded-lg">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={displayName} />
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{displayName}</span>
              <span className="truncate text-muted-foreground text-xs">{user.email}</span>
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
  );
}
