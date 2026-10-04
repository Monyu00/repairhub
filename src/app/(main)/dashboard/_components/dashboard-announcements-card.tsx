"use client";

import { useState } from "react";

import Link from "next/link";

import { ChevronDown, ChevronUp, Megaphone, Pin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnnouncementItem } from "@/server/announcements";

interface DashboardAnnouncementsCardProps {
  announcements: AnnouncementItem[];
  isAdmin: boolean;
}

export function DashboardAnnouncementsCard({ announcements, isAdmin }: DashboardAnnouncementsCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (announcements.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">系統公告</CardTitle>
          </div>
          {isAdmin && (
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link href="/dashboard/announcements">管理公告</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <p className="text-sm">目前尚無內部公告</p>
            {isAdmin && (
              <Button asChild variant="link" size="sm" className="mt-1 text-xs">
                <Link href="/dashboard/announcements">立即發佈第一則公告</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("zh-TW", {
        month: "numeric",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="border-border shadow-2xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Megaphone className="size-3.5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-base">系統與營運公告</CardTitle>
            <CardDescription className="text-xs">最新內部修繕排程與注意事項</CardDescription>
          </div>
        </div>
        {isAdmin && (
          <Button asChild variant="ghost" size="sm" className="h-7 text-muted-foreground text-xs hover:text-foreground">
            <Link href="/dashboard/announcements">前往管理</Link>
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-2 pt-1">
        {announcements.map((item) => {
          const isExpanded = expandedId === item.id;
          const isEdited = new Date(item.updated_at).getTime() - new Date(item.created_at).getTime() > 1000;

          return (
            <div
              key={item.id}
              className="group rounded-lg border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/40"
            >
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={`announcement-body-${item.id}`}
                className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-md text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.is_pinned && (
                      <Badge variant="default" className="gap-0.5 px-1.5 py-0 font-normal text-[10px]">
                        <Pin className="size-2.5" aria-hidden="true" />
                        置頂
                      </Badge>
                    )}
                    <span className="font-semibold text-foreground text-sm transition-colors group-hover:text-primary">
                      {item.title}
                    </span>
                    {isEdited && (
                      <Badge variant="outline" className="px-1 py-0 text-[10px] text-muted-foreground">
                        已編輯
                      </Badge>
                    )}
                  </div>
                  {!isExpanded && (
                    <p className="line-clamp-1 text-muted-foreground text-xs leading-relaxed">{item.body}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-muted-foreground text-xs">{formatDateTime(item.published_at)}</span>
                  <span className="text-muted-foreground transition-transform">
                    {isExpanded ? (
                      <ChevronUp className="size-4" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="size-4" aria-hidden="true" />
                    )}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div
                  id={`announcement-body-${item.id}`}
                  className="mt-3 whitespace-pre-wrap border-border/40 border-t pt-2 text-foreground text-xs leading-relaxed"
                >
                  {item.body}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
