"use client";

import Link from "next/link";

import { ArrowLeftIcon, WrenchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
  photos,
  notes,
  supabaseUrl,
}: TicketTrackerProps) {
  const isClosedOrCompleted = status === "completed" || status === "closed";
  const technicianNotes = notes.filter((n) => n.type === "note");

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4 sm:py-10">
      <div className="mx-auto max-w-xl space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <WrenchIcon className="size-5" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">RepairHub</span>
        </div>

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
        </Card>

        {/* Back button */}
        <div className="flex justify-center pt-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/report">
              <ArrowLeftIcon className="mr-1.5 size-4" />
              返回報修表單
            </Link>
          </Button>
        </div>

        <Separator />

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pb-4">
          © {new Date().getFullYear()} RepairHub. All rights reserved.
        </div>
      </div>
    </div>
  );
}
