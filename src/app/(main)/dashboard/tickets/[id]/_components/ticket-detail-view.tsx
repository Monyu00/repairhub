"use client";

import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

import { TicketStatusBadge } from "../../_components/ticket-status-badge";
import type { TicketStatus } from "../../_components/ticket-types";
import { AdminActions } from "./admin-actions";
import { ClosureSection } from "./closure-section";
import { StatusTimeline, type TimelineNote } from "./status-timeline";
import { TechnicianClaimButton } from "./technician-claim-button";
import { type TicketInfoData, TicketInfoSection } from "./ticket-info-section";
import { type ProgressNote, TicketNotesSection } from "./ticket-notes-section";
import { type PhotoItem, TicketPhotosSection } from "./ticket-photos-section";

interface TicketDetailViewProps {
  ticket: TicketInfoData;
  photos: PhotoItem[];
  notes: ProgressNote[];
  timelineNotes: TimelineNote[];
  userId: string | null;
  userRole: "admin" | "technician" | null;
  assignedTo: string | null;
  supabaseUrl: string;
}

export function TicketDetailView({
  ticket,
  photos,
  notes,
  timelineNotes,
  userId,
  userRole,
  assignedTo,
  supabaseUrl,
}: TicketDetailViewProps) {
  const isAdmin = userRole === "admin";
  const isAssignedTech = userId !== null && assignedTo === userId;
  const canViewReporter = isAdmin || userRole === "technician";
  const canAddNote = isAssignedTech || isAdmin;
  const canSubmitClosure = (isAssignedTech || isAdmin) && ticket.status === "in_progress";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header & Actions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 gap-1 text-muted-foreground text-xs">
            <Link href="/dashboard/tickets">
              <ArrowLeft className="size-3.5" />
              返回單據列表
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-3 border-border border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="flex items-center gap-2 font-bold text-2xl text-foreground tracking-tight">
                <span>報修單詳情</span>
                <span className="font-mono font-normal text-base text-muted-foreground">#{ticket.id.slice(0, 8)}</span>
              </h1>
              <TicketStatusBadge status={ticket.status as TicketStatus} />
            </div>
            <p className="text-muted-foreground text-xs">
              單據識別碼: <span className="font-mono">{ticket.id}</span>
            </p>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            {isAdmin && <AdminActions ticketId={ticket.id} status={ticket.status} />}
            {userRole === "technician" && (
              <TechnicianClaimButton
                ticketId={ticket.id}
                status={ticket.status}
                isAssignedToMe={userId !== null && assignedTo === userId}
              />
            )}
          </div>
        </div>
      </div>

      {/* Grid Layout: Left Column (Main Info & Workflow), Right Column (Timeline) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Main Info */}
          <TicketInfoSection ticket={ticket} canViewReporter={canViewReporter} />

          {/* Submission Photos */}
          <TicketPhotosSection photos={photos} supabaseUrl={supabaseUrl} phase="report" title="報修通報照片" />

          {/* Technician Closure Workflow (When in_progress and assigned) */}
          {canSubmitClosure && <ClosureSection ticketId={ticket.id} />}

          {/* Closure Photos (When completed/closed) */}
          <TicketPhotosSection photos={photos} supabaseUrl={supabaseUrl} phase="closure" title="維修完工照片" />

          {/* Progress Notes */}
          <TicketNotesSection ticketId={ticket.id} notes={notes} canAddNote={canAddNote} />
        </div>

        {/* Right Column (1 col) - Timeline */}
        <div className="space-y-6">
          <StatusTimeline createdAt={ticket.createdAt} notes={timelineNotes} />
        </div>
      </div>
    </div>
  );
}
