"use client";

import { useState } from "react";

import { ChevronDown, ChevronUp, Megaphone, Pin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AnnouncementItem } from "@/server/announcements";

interface PublicAnnouncementsBannerProps {
  announcements: AnnouncementItem[];
}

export function PublicAnnouncementsBanner({ announcements }: PublicAnnouncementsBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  if (announcements.length === 0) {
    return null;
  }

  // If there's only 1 announcement
  const currentAnnouncement = announcements[activeItemIndex] ?? announcements[0];
  const hasMultiple = announcements.length > 1;

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
    <div className="overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-2xs transition-all">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Megaphone className="size-4" aria-hidden="true" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-primary text-xs uppercase tracking-wider">系統公告</span>
              {currentAnnouncement.is_pinned && (
                <Badge variant="default" className="gap-1 px-1.5 py-0 font-normal text-[10px]">
                  <Pin className="size-2.5" aria-hidden="true" />
                  置頂
                </Badge>
              )}
              <h2 className="font-semibold text-foreground text-sm">{currentAnnouncement.title}</h2>
              <span className="text-muted-foreground text-xs">
                ({formatDateTime(currentAnnouncement.published_at)})
              </span>
            </div>

            <div className="whitespace-pre-wrap text-foreground/90 text-xs leading-relaxed">
              {expanded ? currentAnnouncement.body : <p className="line-clamp-2">{currentAnnouncement.body}</p>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
          {hasMultiple && (
            <div className="mr-2 flex items-center gap-1 text-muted-foreground text-xs">
              <span>
                {activeItemIndex + 1} / {announcements.length}
              </span>
              <div className="ml-1 flex gap-0.5">
                {announcements.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveItemIndex(idx)}
                    className={`size-2 rounded-full transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                      idx === activeItemIndex ? "w-4 bg-primary" : "bg-primary/20 hover:bg-primary/40"
                    }`}
                    aria-label={`切換至公告 ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            className="h-7 px-2 text-muted-foreground text-xs hover:text-foreground"
          >
            {expanded ? (
              <>
                收合 <ChevronUp className="ml-1 size-3.5" aria-hidden="true" />
              </>
            ) : (
              <>
                查看完整內文 <ChevronDown className="ml-1 size-3.5" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
