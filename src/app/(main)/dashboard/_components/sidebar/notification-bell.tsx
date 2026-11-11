"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead, markNotificationRead } from "@/server/notifications/actions";
import type { TechnicianNotification, TechnicianNotificationsResult } from "@/server/notifications/read";

interface NotificationBellProps {
  result: TechnicianNotificationsResult;
}

function formatCreatedAt(iso: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function NotificationBell({ result }: NotificationBellProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const badge = result.unreadCount > 9 ? "9+" : String(result.unreadCount);

  function handleNotificationClick(notification: TechnicianNotification, event: Event) {
    event.preventDefault();
    setError(null);
    if (notification.isRead) {
      router.push(`/dashboard/tickets/${notification.ticketId}`);
      return;
    }

    startTransition(async () => {
      const actionResult = await markNotificationRead(notification.id);
      if (!actionResult.success) {
        setError(actionResult.error);
        return;
      }
      router.push(`/dashboard/tickets/${actionResult.ticketId}`);
    });
  }

  function handleMarkAllClick(event: Event) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const actionResult = await markAllNotificationsRead();
      if (!actionResult.success) {
        setError(actionResult.error);
        return;
      }
    });
  }

  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`通知，${result.unreadCount} 則未讀`} className="relative">
            <Bell aria-hidden="true" className="size-4" />
            {result.unreadCount > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 flex size-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-medium text-destructive-foreground text-[10px]"
              >
                {badge}
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[calc(100vw-1.5rem)] max-w-80">
          <DropdownMenuLabel>通知</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {result.unreadCount > 0 ? (
            <DropdownMenuItem disabled={isPending} onSelect={handleMarkAllClick}>
              全部已讀
            </DropdownMenuItem>
          ) : null}
          {error ? (
            <DropdownMenuLabel role="alert" className="text-destructive">
              {error}
            </DropdownMenuLabel>
          ) : null}
          {result.notifications.length === 0 ? (
            <DropdownMenuLabel className="font-normal text-muted-foreground">目前沒有通知</DropdownMenuLabel>
          ) : (
            result.notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="rounded-md px-1.5 py-2"
                disabled={isPending}
                onSelect={(event) => handleNotificationClick(notification, event)}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      notification.isRead ? "bg-transparent" : "bg-primary",
                    )}
                  />
                  <span className="min-w-0 flex-1 font-medium">新報修單</span>
                </span>
                <span className="mt-0.5 block text-muted-foreground text-xs">
                  {formatCreatedAt(notification.createdAt)}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
