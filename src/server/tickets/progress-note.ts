import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { TicketDetailViewer } from "./capabilities";
import { getProgressNoteCapability } from "./capabilities";

interface AddProgressNoteInput {
  ticketId: string;
  content: string;
  viewer: TicketDetailViewer;
}

export async function addProgressNote(
  supabase: SupabaseClient<Database>,
  input: AddProgressNoteInput,
): Promise<{ success: boolean; error?: string }> {
  const { ticketId, content, viewer } = input;
  const trimmed = content.trim();

  if (!trimmed) {
    return { success: false, error: "備註內容不可為空白" };
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, assigned_to")
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket) {
    return { success: false, error: "找不到該單據" };
  }

  const capability = getProgressNoteCapability({ assignedTo: ticket.assigned_to }, viewer);

  if (!capability.enabled) {
    return { success: false, error: capability.disabledReason ?? "無權限為此單據新增進度備註" };
  }

  const { error: insertError } = await supabase.from("ticket_notes").insert({
    ticket_id: ticketId,
    author_id: viewer.userId,
    content: trimmed,
    type: "note",
  });

  if (insertError) {
    console.error("Failed to insert progress note:", insertError);
    return { success: false, error: "新增備註失敗，請稍後再試" };
  }

  return { success: true };
}
