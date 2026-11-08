"use client";

import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { Button } from "@/components/ui/button";
import { getTicketDetailCapabilities } from "@/server/tickets/capabilities";
import type { TicketDetail } from "@/server/tickets/detail";

import { AdminActions } from "./admin-actions";
import { ClosureSection } from "./closure-section";
import { CompletionSummarySection } from "./completion-summary-section";
import { StatusTimeline } from "./status-timeline";
import { TechnicianClaimButton } from "./technician-claim-button";
import { TicketInfoSection } from "./ticket-info-section";
import { TicketNotesSection } from "./ticket-notes-section";

interface TicketDetailViewProps {
  detail: TicketDetail;
  userId: string | null;
  userRole: "admin" | "technician" | null;
  returnTo?: string;
}

export function TicketDetailView({ detail, userId, userRole, returnTo = "/dashboard/tickets" }: TicketDetailViewProps) {
  const { ticket, photos, notes } = detail;
  const isAdmin = userRole === "admin";
  const canViewReporter = isAdmin || userRole === "technician";
  const capabilities = getTicketDetailCapabilities(detail, { role: userRole, userId });
  const canAddNote = capabilities.progressNote.enabled;
  const canSubmitClosure = capabilities.closure.enabled;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header & Actions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 gap-1 text-muted-foreground text-xs">
            <Link href={returnTo}>
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
              <TicketStatusBadge status={ticket.status} />
            </div>
            <p className="text-muted-foreground text-xs">
              單據識別碼: <span className="font-mono">{ticket.id}</span>
            </p>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            {isAdmin && <AdminActions ticketId={ticket.id} capabilities={capabilities} />}
            {userRole === "technician" && (
              <TechnicianClaimButton ticketId={ticket.id} capability={capabilities.claim} />
            )}
          </div>
        </div>
      </div>

      {/* Grid Layout: Left Column (Main Info & Workflow), Right Column (Timeline) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Main Info */}
          <TicketInfoSection ticket={ticket} canViewReporter={canViewReporter} photos={photos} />

          {/* Technician Closure Workflow (When in_progress and assigned) */}
          {canSubmitClosure && <ClosureSection ticketId={ticket.id} />}

          <CompletionSummarySection notes={notes} photos={photos} />

          {/* Progress Notes */}
          <TicketNotesSection ticketId={ticket.id} notes={notes} canAddNote={canAddNote} />
        </div>

        {/* Right Column (1 col) - Timeline */}
        <div className="space-y-6">
          <StatusTimeline createdAt={ticket.createdAt} notes={notes} reporterName={ticket.reporterName} />
        </div>
      </div>
    </div>
  );
}
