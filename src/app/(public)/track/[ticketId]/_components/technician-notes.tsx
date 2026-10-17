import { MessageSquareIcon } from "lucide-react";

interface Note {
  id: string;
  content: string;
  created_at: string;
}

interface TechnicianNotesProps {
  notes: Note[];
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TechnicianNotes({ notes }: TechnicianNotesProps) {
  if (notes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquareIcon className="size-4 text-muted-foreground" />
        <h2 className="font-semibold text-foreground text-sm">技師進度備註</h2>
      </div>
      <div className="space-y-3">
        {notes.map((note) => (
          <div key={note.id} className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3">
            <p className="whitespace-pre-wrap text-foreground text-sm">{note.content}</p>
            <p className="text-muted-foreground text-xs">{formatDateTime(note.created_at)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
