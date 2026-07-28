"use client";

import { useState } from "react";

import { format } from "date-fns";
import { zhTW } from "date-fns/locale/zh-TW";
import { Loader2, MessageSquarePlus, MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { addProgressNote } from "../_actions/ticket-actions";

export interface ProgressNote {
  id: string;
  content: string;
  type: "note" | "status_change";
  createdAt: string;
  authorRole?: string | null;
  authorId?: string | null;
}

interface TicketNotesSectionProps {
  ticketId: string;
  notes: ProgressNote[];
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
        toast.error(result.error || "新增備註失敗");
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
        <CardTitle className="flex items-center justify-between font-semibold text-base">
          <span className="flex items-center gap-2">
            <MessageSquareText className="size-4 text-primary" />
            維修進度備註
          </span>
          <span className="font-normal text-muted-foreground text-xs">({progressNotes.length} 則)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Notes List */}
        {progressNotes.length === 0 ? (
          <p className="rounded bg-muted/20 p-3 text-center text-muted-foreground text-xs italic">目前無進度備註記錄</p>
        ) : (
          <div className="space-y-3">
            {progressNotes.map((note) => {
              const formattedDate = note.createdAt
                ? format(new Date(note.createdAt), "yyyy/MM/dd HH:mm", {
                    locale: zhTW,
                  })
                : "-";

              const roleLabel = getRoleLabel(note.authorRole);

              return (
                <div key={note.id} className="space-y-1 rounded-lg border border-border/40 bg-muted/40 p-3">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {roleLabel}
                      </span>
                    </span>
                    <span>{formattedDate}</span>
                  </div>
                  <p className="whitespace-pre-wrap pt-1 text-foreground text-xs leading-relaxed sm:text-sm">
                    {note.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Note Form (Technician / Admin) */}
        {canAddNote && (
          <form onSubmit={handleAddNote} className="space-y-3 border-border/40 border-t pt-3">
            <div className="space-y-1.5">
              <label
                htmlFor="progress-note-input"
                className="flex items-center gap-1.5 font-medium text-foreground text-xs"
              >
                <MessageSquarePlus className="size-3.5 text-primary" />
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
