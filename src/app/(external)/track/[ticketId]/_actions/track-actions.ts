"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function confirmFix(ticketId: string, email: string): Promise<ActionResult> {
  if (!email?.trim()) {
    return { success: false, error: "請輸入電子郵件地址" };
  }

  const supabase = createAdminClient();

  // Fetch ticket with reporter_email for verification
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, status, reporter_email")
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket) {
    return { success: false, error: "找不到該報修單" };
  }

  if (ticket.status !== "completed") {
    return { success: false, error: "僅已完工的報修單可進行此操作" };
  }

  // Verify reporter email
  if (ticket.reporter_email.toLowerCase() !== email.trim().toLowerCase()) {
    return { success: false, error: "電子郵件不符，無法操作此報修單" };
  }

  // Update status to closed
  const { error: updateError } = await supabase.from("tickets").update({ status: "closed" }).eq("id", ticketId);

  if (updateError) {
    console.error("Failed to confirm fix:", updateError);
    return { success: false, error: "操作失敗，請稍後再試" };
  }

  // Record status_change note
  await supabase.from("ticket_notes").insert({
    ticket_id: ticketId,
    author_id: null,
    content: "通報人已確認修復完成，報修單結案",
    type: "status_change",
  });

  revalidatePath(`/track/${ticketId}`);
  return { success: true };
}

export async function reopenTicket(ticketId: string, email: string, feedback: string): Promise<ActionResult> {
  if (!email?.trim()) {
    return { success: false, error: "請輸入電子郵件地址" };
  }

  if (!feedback?.trim()) {
    return { success: false, error: "請輸入問題反饋說明" };
  }

  const supabase = createAdminClient();

  // Fetch ticket with reporter_email for verification
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, status, reporter_email")
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket) {
    return { success: false, error: "找不到該報修單" };
  }

  if (ticket.status !== "completed") {
    return { success: false, error: "僅已完工的報修單可進行此操作" };
  }

  // Verify reporter email
  if (ticket.reporter_email.toLowerCase() !== email.trim().toLowerCase()) {
    return { success: false, error: "電子郵件不符，無法操作此報修單" };
  }

  // Update status back to in_progress
  const { error: updateError } = await supabase.from("tickets").update({ status: "in_progress" }).eq("id", ticketId);

  if (updateError) {
    console.error("Failed to reopen ticket:", updateError);
    return { success: false, error: "操作失敗，請稍後再試" };
  }

  // Record status_change note with feedback
  await supabase.from("ticket_notes").insert({
    ticket_id: ticketId,
    author_id: null,
    content: `通報人反映問題仍在，已重新開啟工單：${feedback.trim()}`,
    type: "status_change",
  });

  revalidatePath(`/track/${ticketId}`);
  return { success: true };
}
