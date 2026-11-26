import { FileTextIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TicketNote, TicketPhoto } from "@/server/tickets/detail";

import { TicketPhotosSection } from "./ticket-photos-section";

const COMPLETION_SUMMARY_PREFIX = "已提交完工結案：";

interface CompletionSummarySectionProps {
  notes: TicketNote[];
  photos: TicketPhoto[];
}

export function CompletionSummarySection({ notes, photos }: CompletionSummarySectionProps) {
  const summary = notes
    .filter((note) => note.type === "status_change" && note.content.startsWith(COMPLETION_SUMMARY_PREFIX))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    ?.content.slice(COMPLETION_SUMMARY_PREFIX.length);

  const hasClosurePhotos = photos.some((photo) => photo.phase === "closure");

  if (!summary && !hasClosurePhotos) return null;

  return (
    <Card className="shadow-2xs">
      <CardHeader className="border-border/50 border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <FileTextIcon className="text-primary size-4" />
          完工說明與備註
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {summary && <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>}
        <TicketPhotosSection photos={photos} phase="closure" title="維修完工照片" />
      </CardContent>
    </Card>
  );
}
