import { MessageSquareIcon } from "lucide-react";

import { formatTicketDate } from "@/lib/formatters";
import type { TicketNote } from "@/server/tickets/detail";

interface TechnicianNotesProps {
  notes: TicketNote[];
}

export function TechnicianNotes({ notes }: TechnicianNotesProps) {
  if (notes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquareIcon className="text-muted-foreground size-4" />
        <h2 className="text-foreground text-sm font-semibold">技師進度備註</h2>
      </div>
      <div className="space-y-3">
        {notes.map((note) => (
          <div key={note.id} className="border-border bg-muted/40 space-y-1.5 rounded-lg border p-3">
            <p className="text-foreground text-sm whitespace-pre-wrap">{note.content}</p>
            <p className="text-muted-foreground text-xs">{formatTicketDate(note.createdAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
