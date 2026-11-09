"use client";

import { Building2, Calendar, Clock, HardDrive, Mail, MapPin, Phone, Star, Tag, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTicketDate, formatTicketLocation } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { TicketPhoto } from "@/server/tickets/detail";
import type { TicketRecord } from "@/server/tickets/query";

import { TicketPhotosSection } from "./ticket-photos-section";

interface TicketInfoSectionProps {
  ticket: TicketRecord;
  canViewReporter: boolean;
  photos: TicketPhoto[];
}

export function TicketInfoSection({ ticket, canViewReporter, photos }: TicketInfoSectionProps) {
  const formattedCreatedAt = ticket.createdAt ? formatTicketDate(ticket.createdAt) : "-";

  const formattedUpdatedAt = ticket.updatedAt ? formatTicketDate(ticket.updatedAt) : "-";

  return (
    <Card className="shadow-2xs">
      <CardHeader className="border-border/50 border-b pb-3">
        <CardTitle className="flex items-center gap-2 font-semibold text-base">
          <Building2 className="size-4 text-primary" />
          報修詳細資訊
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4 text-sm">
        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
              <MapPin className="size-3.5" />
              故障地點
            </span>
            <p className="font-medium text-foreground">
              {formatTicketLocation(ticket, { includeCode: true, includeFloor: true })}
            </p>
          </div>

          <div className="space-y-1">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
              <Tag className="size-3.5" />
              報修類別
            </span>
            <p className="font-medium text-foreground">{ticket.category.name}</p>
          </div>

          {ticket.equipmentName && (
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
                <HardDrive className="size-3.5" />
                相關設備
              </span>
              <p className="font-medium text-foreground">{ticket.equipmentName}</p>
            </div>
          )}

          <div className="space-y-1">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
              <Calendar className="size-3.5" />
              通報時間
            </span>
            <p className="font-medium text-foreground">{formattedCreatedAt}</p>
          </div>

          <div className="space-y-1">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
              <Clock className="size-3.5" />
              最後更新
            </span>
            <p className="font-medium text-foreground">{formattedUpdatedAt}</p>
          </div>
        </div>

        {/* Satisfaction Rating (If provided) */}
        {ticket.rating != null && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                <Star className="size-4 fill-warning text-warning" />
                通報人完工服務評分
              </span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn(
                      "size-3.5",
                      s <= (ticket.rating ?? 0)
                        ? "fill-warning text-warning"
                        : "fill-transparent text-muted-foreground/30",
                    )}
                  />
                ))}
                <span className="ml-1 font-bold text-foreground text-xs">{ticket.rating} / 5</span>
              </div>
            </div>
            {ticket.ratedAt && (
              <span className="text-muted-foreground text-xs">評分時間：{formatTicketDate(ticket.ratedAt)}</span>
            )}
          </div>
        )}

        {/* Description */}
        <div className="space-y-1.5 border-border/40 border-t pt-2">
          <span className="font-medium text-muted-foreground text-xs">故障狀況描述</span>
          <p className="whitespace-pre-wrap rounded-md border border-border/40 bg-muted/30 p-3 text-foreground text-xs leading-relaxed sm:text-sm">
            {ticket.description}
          </p>
        </div>

        {/* Reporter Info (Gated) */}
        <div className="space-y-2 border-border/40 border-t pt-2">
          <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
            <User className="size-3.5" />
            通報者聯絡資訊
          </span>
          {canViewReporter ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm">
              {ticket.reporterName && (
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <User className="size-3.5 text-muted-foreground" />
                  <span>
                    {ticket.reporterName}
                    {ticket.reporterDepartment && (
                      <span className="ml-1 font-normal text-muted-foreground">（{ticket.reporterDepartment}）</span>
                    )}
                  </span>
                </div>
              )}
              {!ticket.reporterName && ticket.reporterDepartment && (
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  <span>{ticket.reporterDepartment}</span>
                </div>
              )}
              {ticket.reporterEmail && (
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Mail className="size-3.5 text-muted-foreground" />
                  <span>{ticket.reporterEmail}</span>
                </div>
              )}
              {ticket.reporterPhone && (
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Phone className="size-3.5 text-muted-foreground" />
                  <span>{ticket.reporterPhone}</span>
                </div>
              )}
              {!ticket.reporterName && !ticket.reporterDepartment && !ticket.reporterEmail && !ticket.reporterPhone && (
                <span className="text-muted-foreground italic">未提供聯絡資訊</span>
              )}
            </div>
          ) : (
            <p className="rounded bg-muted/20 p-2 text-muted-foreground/70 text-xs italic">
              通報者資訊受保護，僅維修技師與管理者可檢視。
            </p>
          )}
        </div>

        <TicketPhotosSection photos={photos} phase="report" title="報修通報照片" />
      </CardContent>
    </Card>
  );
}
