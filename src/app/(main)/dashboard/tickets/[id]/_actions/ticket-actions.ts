"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function addProgressNote(ticketId: string, content: string) {
  if (!content?.trim()) {
    return { success: false, error: "備註內容不可為空白" };
  }

  const supabase = await createClient();
  const { data: userRes, error: userError } = await supabase.auth.getUser();

  if (userError || !userRes.user) {
    return { success: false, error: "尚未登入，請先登入" };
  }

  const userId = userRes.user.id;

  // Check ticket and permission
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, status, assigned_to")
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket) {
    return { success: false, error: "找不到該單據" };
  }

  const { data: profile } = await supabase.from("profiles").select("user_role").eq("id", userId).maybeSingle();

  const userRole = profile?.user_role;
  const isAssignedTech = ticket.assigned_to === userId;
  const isAdmin = userRole === "admin";

  if (!isAssignedTech && !isAdmin) {
    return { success: false, error: "無權限為此單據新增進度備註" };
  }

  const { error: insertError } = await supabase.from("ticket_notes").insert({
    ticket_id: ticketId,
    author_id: userId,
    content: content.trim(),
    type: "note",
  });

  if (insertError) {
    console.error("Failed to insert progress note:", insertError);
    return { success: false, error: "新增備註失敗，請稍後再試" };
  }

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  return { success: true };
}

export async function submitClosure(ticketId: string, summary: string, photosBase64: string[]) {
  if (photosBase64.length === 0) {
    return { success: false, error: "結案需至少上傳 1 張完工證明照片" };
  }

  if (photosBase64.length > 3) {
    return { success: false, error: "完工照片最多不可超過 3 張" };
  }

  const supabase = await createClient();
  const { data: userRes, error: userError } = await supabase.auth.getUser();

  if (userError || !userRes.user) {
    return { success: false, error: "尚未登入，請先登入" };
  }

  const userId = userRes.user.id;

  // Check ticket status and assignment
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, status, assigned_to")
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket) {
    return { success: false, error: "找不到該單據" };
  }

  if (ticket.status !== "in_progress") {
    return { success: false, error: "僅維修中的單據可進行結案作業" };
  }

  const { data: profile } = await supabase.from("profiles").select("user_role").eq("id", userId).maybeSingle();

  const isAssignedTech = ticket.assigned_to === userId;
  const isAdmin = profile?.user_role === "admin";

  if (!isAssignedTech && !isAdmin) {
    return { success: false, error: "僅指派技師或管理者可進行結案" };
  }

  // 1. Upload photos to Storage & Insert ticket_photos
  for (let i = 0; i < photosBase64.length; i++) {
    const photoData = photosBase64[i];
    const matches = photoData.match(/^data:(.+);base64,(.+)$/);

    let buffer: Buffer;
    let mimeType = "image/jpeg";

    if (matches) {
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], "base64");
    } else {
      buffer = Buffer.from(photoData, "base64");
    }

    const ext = mimeType.split("/")[1] || "jpg";
    const storagePath = `closure/${ticketId}/${Date.now()}_${i}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("ticket-photos").upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (uploadError) {
      console.error("Failed to upload closure photo:", uploadError);
      return { success: false, error: `照片 #${i + 1} 上傳失敗` };
    }

    const { error: photoDbError } = await supabase.from("ticket_photos").insert({
      ticket_id: ticketId,
      storage_path: storagePath,
      phase: "closure",
    });

    if (photoDbError) {
      console.error("Failed to save closure photo record:", photoDbError);
    }
  }

  // 2. Update ticket status to completed
  const { error: updateError } = await supabase
    .from("tickets")
    .update({
      status: "completed",
    })
    .eq("id", ticketId);

  if (updateError) {
    console.error("Failed to update ticket status to completed:", updateError);
    return { success: false, error: "更新單據狀態失敗" };
  }

  // 3. Create status change note & optional summary note
  const closureNoteContent = summary?.trim() ? `已提交完工結案：${summary.trim()}` : "技師已完成維修並提交結案照片";

  await supabase.from("ticket_notes").insert({
    ticket_id: ticketId,
    author_id: userId,
    content: closureNoteContent,
    type: "status_change",
  });

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  return { success: true };
}

export async function cancelTicket(ticketId: string, reason: string) {
  if (!reason?.trim()) {
    return { success: false, error: "請輸入取消原因" };
  }

  const supabase = await createClient();
  const { data: userRes, error: userError } = await supabase.auth.getUser();

  if (userError || !userRes.user) {
    return { success: false, error: "尚未登入，請先登入" };
  }

  const userId = userRes.user.id;

  // Verify Admin role
  const { data: profile } = await supabase.from("profiles").select("user_role").eq("id", userId).maybeSingle();

  if (profile?.user_role !== "admin") {
    return { success: false, error: "僅管理者可取消報修單據" };
  }

  // Verify status
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, status")
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket) {
    return { success: false, error: "找不到該單據" };
  }

  if (ticket.status !== "pending" && ticket.status !== "in_progress") {
    return { success: false, error: "僅待處理或維修中的單據可被取消" };
  }

  // Update status to cancelled
  const { error: updateError } = await supabase.from("tickets").update({ status: "cancelled" }).eq("id", ticketId);

  if (updateError) {
    console.error("Failed to cancel ticket:", updateError);
    return { success: false, error: "取消單據失敗" };
  }

  // Record status_change note
  await supabase.from("ticket_notes").insert({
    ticket_id: ticketId,
    author_id: userId,
    content: `管理者已取消此單據，原因：${reason.trim()}`,
    type: "status_change",
  });

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  return { success: true };
}

export async function returnToPending(ticketId: string) {
  const supabase = await createClient();
  const { data: userRes, error: userError } = await supabase.auth.getUser();

  if (userError || !userRes.user) {
    return { success: false, error: "尚未登入，請先登入" };
  }

  const userId = userRes.user.id;

  // Verify Admin role
  const { data: profile } = await supabase.from("profiles").select("user_role").eq("id", userId).maybeSingle();

  if (profile?.user_role !== "admin") {
    return { success: false, error: "僅管理者可執行退回待處理" };
  }

  // Verify status
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, status")
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket) {
    return { success: false, error: "找不到該單據" };
  }

  if (ticket.status !== "in_progress") {
    return { success: false, error: "僅維修中的單據可退回待處理" };
  }

  // Update status to pending and unassign
  const { error: updateError } = await supabase
    .from("tickets")
    .update({
      status: "pending",
      assigned_to: null,
    })
    .eq("id", ticketId);

  if (updateError) {
    console.error("Failed to return ticket to pending:", updateError);
    return { success: false, error: "退回待處理失敗" };
  }

  // Record status_change note
  await supabase.from("ticket_notes").insert({
    ticket_id: ticketId,
    author_id: userId,
    content: "管理者已將此單據退回待處理狀態（清除指派技師）",
    type: "status_change",
  });

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  return { success: true };
}
