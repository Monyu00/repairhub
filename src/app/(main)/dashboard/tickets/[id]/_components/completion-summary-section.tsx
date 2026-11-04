import { FileTextIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TicketNote } from "@/server/tickets/detail";

const COMPLETION_SUMMARY_PREFIX = "已提交完工結案：";

interface CompletionSummarySectionProps {
  notes: TicketNote[];
}

export function CompletionSummarySection({ notes }: CompletionSummarySectionProps) {
  const summary = notes
    .filter((note) => note.type === "status_change" && note.content.startsWith(COMPLETION_SUMMARY_PREFIX))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    ?.content.slice(COMPLETION_SUMMARY_PREFIX.length);

  if (!summary) return null;

  return (
    <Card className="shadow-2xs">
      <CardHeader className="border-border/50 border-b pb-3">
        <CardTitle className="flex items-center gap-2 font-semibold text-base">
          <FileTextIcon className="size-4 text-primary" />
          完工說明與備註
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">{summary}</p>
      </CardContent>
    </Card>
  );
}
