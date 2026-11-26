"use client";

import { useRouter } from "next/navigation";

import { ArrowLeftIcon, StarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateOnly } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { TicketDetail } from "@/server/tickets/detail";

import { ReporterActions } from "./reporter-actions";
import { StatusTimeline } from "./status-timeline";
import { TechnicianNotes } from "./technician-notes";
import { TicketDetails } from "./ticket-details";
import { TicketHeader } from "./ticket-header";
import { TicketPhotosGallery } from "./ticket-photos-gallery";
import { TicketSearch } from "./ticket-search";

interface TicketTrackerProps {
  detail: TicketDetail;
}

export function TicketTracker({ detail }: TicketTrackerProps) {
  const router = useRouter();
  const { ticket, photos, notes } = detail;
  const isClosedOrCompleted = ticket.status === "completed" || ticket.status === "closed";
  const technicianNotes = notes.filter((n) => n.type === "note");
  const rating = ticket.rating;

  return (
    <div className="px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-foreground text-xl font-semibold tracking-tight">報修單追蹤</h1>

        {/* Search Bar */}
        <TicketSearch currentTicketId={ticket.id} />

        {/* Main Card */}
        <Card className="divide-border border-border bg-card divide-y border shadow-sm">
          {/* Header section */}
          <div className="p-5 sm:p-6">
            <TicketHeader ticketId={ticket.id} status={ticket.status} createdAt={ticket.createdAt} />
          </div>

          {/* Details section */}
          <div className="p-5 sm:p-6">
            <TicketDetails ticket={ticket} />
          </div>

          {/* Report photos */}
          {photos.some((p) => p.phase === "report") && (
            <div className="p-5 sm:p-6">
              <TicketPhotosGallery photos={photos} phase="report" title="報修照片" />
            </div>
          )}

          {/* Status Timeline */}
          <div className="p-5 sm:p-6">
            <StatusTimeline createdAt={ticket.createdAt} currentStatus={ticket.status} events={notes} />
          </div>

          {/* Technician notes */}
          {technicianNotes.length > 0 && (
            <div className="p-5 sm:p-6">
              <TechnicianNotes notes={technicianNotes} />
            </div>
          )}

          {/* Reporter verification & actions – only when completed */}
          {ticket.status === "completed" && (
            <div className="p-5 sm:p-6">
              <ReporterActions ticketId={ticket.id} />
            </div>
          )}

          {/* Closure photos */}
          {isClosedOrCompleted && photos.some((p) => p.phase === "closure") && (
            <div className="p-5 sm:p-6">
              <TicketPhotosGallery photos={photos} phase="closure" title="完工照片" />
            </div>
          )}

          {/* Rating display on closed ticket */}
          {ticket.status === "closed" && rating != null && (
            <div className="p-5 sm:p-6">
              <div className="border-warning/20 bg-warning/5 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3.5">
                <div className="space-y-1">
                  <span className="text-foreground text-xs font-semibold">通報人完工服務評分</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <StarIcon
                        key={s}
                        className={cn(
                          "size-4",
                          s <= rating ? "fill-warning text-warning" : "text-muted-foreground/30 fill-transparent",
                        )}
                      />
                    ))}
                    <span className="text-foreground ml-1.5 text-xs font-bold">{rating} / 5</span>
                  </div>
                </div>
                {ticket.ratedAt && (
                  <span className="text-muted-foreground text-xs">評分於 {formatDateOnly(ticket.ratedAt)}</span>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Back button */}
        <div className="flex justify-center pt-2">
          <Button variant="ghost" size="sm" type="button" onClick={() => router.back()}>
            <ArrowLeftIcon className="mr-1.5 size-4" />
            返回上一頁
          </Button>
        </div>
      </div>
    </div>
  );
}
