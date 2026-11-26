"use client";

import { useState } from "react";

import { Loader2, MessageSquarePlus, MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatTicketDate } from "@/lib/formatters";
import type { TicketNote } from "@/server/tickets/detail";

import { addProgressNote } from "../_actions/ticket-actions";

interface TicketNotesSectionProps {
  ticketId: string;
  notes: TicketNote[];
  canAddNote: boolean;
}

function getRoleLabel(role?: string | null) {
  if (role === "admin") return "管理者";
  if (role === "technician") return "技師";
  return "人員";
}

export function TicketNotesSection({ ticketId, notes, canAddNote }: TicketNotesSectionProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter progress notes only (type === "note")
  const progressNotes = notes
    .filter((n) => n.type === "note")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await addProgressNote(ticketId, content);
      if (result.success) {
        toast.success("已新增進度備註");
        setContent("");
      } else {
        toast.error(result.error ?? "新增備註失敗");
      }
    } catch (err) {
      console.error("Error adding note:", err);
      toast.error("新增備註時發生網路錯誤");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-2xs">
      <CardHeader className="border-border/50 border-b pb-3">
        <CardTitle className="flex items-center justify-between text-base font-semibold">
          <span className="flex items-center gap-2">
            <MessageSquareText className="text-primary size-4" />
            維修進度備註
          </span>
          <span className="text-muted-foreground text-xs font-normal">({progressNotes.length} 則)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Notes List */}
        {progressNotes.length === 0 ? (
          <p className="bg-muted/20 text-muted-foreground rounded p-3 text-center text-xs italic">目前無進度備註記錄</p>
        ) : (
          <div className="space-y-3">
            {progressNotes.map((note) => {
              const formattedDate = note.createdAt ? formatTicketDate(note.createdAt) : "-";

              const roleLabel = getRoleLabel(note.authorRole);

              return (
                <div key={note.id} className="border-border/40 bg-muted/40 space-y-1 rounded-lg border p-3">
                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span className="text-foreground flex items-center gap-1.5 font-semibold">
                      {note.authorName && <span>{note.authorName}</span>}
                      <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">{roleLabel}</span>
                    </span>
                    <span>{formattedDate}</span>
                  </div>
                  <p className="text-foreground pt-1 text-xs leading-relaxed whitespace-pre-wrap sm:text-sm">
                    {note.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Note Form (Technician / Admin) */}
        {canAddNote && (
          <form onSubmit={handleAddNote} className="border-border/40 space-y-3 border-t pt-3">
            <div className="space-y-1.5">
              <label
                htmlFor="progress-note-input"
                className="text-foreground flex items-center gap-1.5 text-xs font-medium"
              >
                <MessageSquarePlus className="text-primary size-3.5" />
                新增備註
              </label>
              <Textarea
                id="progress-note-input"
                placeholder="輸入檢測說明、叫修零件或最新處置狀況..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={2}
                className="resize-none text-xs sm:text-sm"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                disabled={isSubmitting || !content.trim()}
              >
                {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                <span>{isSubmitting ? "送出中..." : "新增備註"}</span>
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
