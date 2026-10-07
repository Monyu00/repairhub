"use client";

import { useRouter } from "next/navigation";

import { ArrowLeftIcon, StarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ReporterActions } from "./reporter-actions";
import { StatusTimeline } from "./status-timeline";
import { TechnicianNotes } from "./technician-notes";
import { TicketDetails } from "./ticket-details";
import { TicketHeader, type TicketStatus } from "./ticket-header";
import { TicketPhotosGallery } from "./ticket-photos-gallery";
import { TicketSearch } from "./ticket-search";

interface Photo {
  id: string;
  storage_path: string;
  phase: "report" | "closure";
}

interface Note {
  id: string;
  content: string;
  type: "note" | "status_change";
  created_at: string;
}

interface TicketTrackerProps {
  ticketId: string;
  status: TicketStatus;
  createdAt: string;
  category: string;
  building: string;
  space: string;
  description: string;
  equipment: string | null;
  rating?: number | null;
  ratedAt?: string | null;
  photos: Photo[];
  notes: Note[];
  supabaseUrl: string;
}

export function TicketTracker({
  ticketId,
  status,
  createdAt,
  category,
  building,
  space,
  description,
  equipment,
  rating,
  ratedAt,
  photos,
  notes,
  supabaseUrl,
}: TicketTrackerProps) {
  const router = useRouter();
  const isClosedOrCompleted = status === "completed" || status === "closed";
  const technicianNotes = notes.filter((n) => n.type === "note");

  return (
    <div className="py-6 px-4 sm:py-10">
      <div className="mx-auto max-w-xl space-y-4">
        {/* Search Bar */}
        <TicketSearch currentTicketId={ticketId} />

        {/* Main Card */}
        <Card className="border border-border bg-card shadow-sm divide-y divide-border">
          {/* Header section */}
          <div className="p-5 sm:p-6">
            <TicketHeader ticketId={ticketId} status={status} createdAt={createdAt} />
          </div>

          {/* Details section */}
          <div className="p-5 sm:p-6">
            <TicketDetails
              category={category}
              building={building}
              space={space}
              description={description}
              equipment={equipment}
            />
          </div>

          {/* Report photos */}
          {photos.some((p) => p.phase === "report") && (
            <div className="p-5 sm:p-6">
              <TicketPhotosGallery photos={photos} supabaseUrl={supabaseUrl} phase="report" title="報修照片" />
            </div>
          )}

          {/* Status Timeline */}
          <div className="p-5 sm:p-6">
            <StatusTimeline createdAt={createdAt} currentStatus={status} events={notes} />
          </div>

          {/* Technician notes */}
          {technicianNotes.length > 0 && (
            <div className="p-5 sm:p-6">
              <TechnicianNotes notes={technicianNotes} />
            </div>
          )}

          {/* Reporter verification & actions – only when completed */}
          {status === "completed" && (
            <div className="p-5 sm:p-6">
              <ReporterActions ticketId={ticketId} />
            </div>
          )}

          {/* Closure photos */}
          {isClosedOrCompleted && photos.some((p) => p.phase === "closure") && (
            <div className="p-5 sm:p-6">
              <TicketPhotosGallery photos={photos} supabaseUrl={supabaseUrl} phase="closure" title="完工照片" />
            </div>
          )}

          {/* Rating display on closed ticket */}
          {status === "closed" && rating != null && (
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-foreground">通報人完工服務評分</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <StarIcon
                        key={s}
                        className={cn(
                          "size-4",
                          s <= rating ? "fill-amber-400 text-amber-500" : "fill-transparent text-muted-foreground/30",
                        )}
                      />
                    ))}
                    <span className="ml-1.5 text-xs font-bold text-foreground">{rating} / 5</span>
                  </div>
                </div>
                {ratedAt && (
                  <span className="text-[11px] text-muted-foreground">
                    評分於 {new Date(ratedAt).toLocaleDateString("zh-TW")}
                  </span>
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
