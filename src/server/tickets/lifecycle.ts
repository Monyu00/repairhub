import { revalidatePath } from "next/cache";

import type { SupabaseClient } from "@supabase/supabase-js";

import { storeTicketPhotos } from "@/lib/storage/ticket-photos";
import type { Database } from "@/lib/supabase/database.types";

export type TicketStatus = Database["public"]["Enums"]["ticket_status"];

export type TicketTransitionType =
  | "claim"
  | "assign"
  | "submit_closure"
  | "confirm_fix"
  | "reopen"
  | "return_to_pending"
  | "cancel";

export type ActorContext =
  | { type: "admin"; userId: string; displayName?: string }
  | { type: "technician"; userId: string; displayName?: string }
  | { type: "reporter"; email: string }
  | { type: "system" };

export type TransitionPayload =
  | { transition: "claim" }
  | { transition: "assign"; technicianId: string }
  | { transition: "submit_closure"; summary?: string; photosBase64: string[] }
  | { transition: "confirm_fix" }
  | { transition: "reopen"; feedback: string }
  | { transition: "return_to_pending" }
  | { transition: "cancel"; reason: string };

export type TransitionTicketOptions = {
  ticketId: string;
  actor: ActorContext;
  skipRevalidation?: boolean;
} & TransitionPayload;

export type TransitionErrorCode =
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "INVALID_PREVIOUS_STATUS"
  | "VALIDATION_FAILED"
  | "CONCURRENCY_CONFLICT"
  | "PHOTO_UPLOAD_FAILED"
  | "DATABASE_ERROR";

export type TransitionResult =
  | {
      success: true;
      data: {
        ticketId: string;
        previousStatus: TicketStatus;
        newStatus: TicketStatus;
        assignedTo?: string | null;
      };
    }
  | {
      success: false;
      error: string;
      code: TransitionErrorCode;
    };

/**
 * Automatically revalidates affected Next.js dashboard and tracking route caches.
 */
function revalidateTicketPaths(ticketId: string) {
  try {
    revalidatePath("/dashboard/tickets");
    revalidatePath(`/dashboard/tickets/${ticketId}`);
    revalidatePath("/dashboard/my-tickets");
    revalidatePath(`/track/${ticketId}`);
  } catch (err) {
    // revalidatePath may throw if executed outside of Next.js request context (e.g. background worker)
    console.warn("revalidatePath skipped:", err);
  }
}

/**
 * Deep module: Ticket Lifecycle State Machine
 * Encapsulates state validation, actor authorization, atomic status mutations,
 * automatic audit notes logging, photo attachment coordination, and cache revalidation.
 */
export async function transitionTicket(
  supabase: SupabaseClient<Database>,
  options: TransitionTicketOptions,
): Promise<TransitionResult> {
  const { ticketId, actor, transition, skipRevalidation } = options;

  // 1. Fetch current ticket state
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, status, assigned_to, reporter_email")
    .eq("id", ticketId)
    .maybeSingle();

  if (ticketError || !ticket) {
    return {
      success: false,
      error: "找不到該報修單據",
      code: "NOT_FOUND",
    };
  }

  const currentStatus = ticket.status as TicketStatus;

  // 2. State transition dispatch and verification
  switch (transition) {
    case "claim": {
      if (actor.type !== "technician") {
        return {
          success: false,
          error: "僅技師身分可進行接單",
          code: "UNAUTHORIZED",
        };
      }

      if (currentStatus !== "pending") {
        return {
          success: false,
          error: "此案件已被接單或不再處於待處理狀態",
          code: "INVALID_PREVIOUS_STATUS",
        };
      }

      const { data: success, error: rpcError } = await supabase.rpc("claim_ticket", {
        p_ticket_id: ticketId,
        p_technician_id: actor.userId,
      });

      if (rpcError || !success) {
        return {
          success: false,
          error: "接單失敗或該案件已被其他技師接單",
          code: "CONCURRENCY_CONFLICT",
        };
      }

      if (!skipRevalidation) revalidateTicketPaths(ticketId);

      return {
        success: true,
        data: {
          ticketId,
          previousStatus: currentStatus,
          newStatus: "in_progress",
          assignedTo: actor.userId,
        },
      };
    }

    case "assign": {
      if (actor.type !== "admin") {
        return {
          success: false,
          error: "僅管理者可執行指派技師",
          code: "UNAUTHORIZED",
        };
      }

      if (!options.technicianId) {
        return {
          success: false,
          error: "請選擇要指派的技師",
          code: "VALIDATION_FAILED",
        };
      }

      if (currentStatus !== "pending") {
        return {
          success: false,
          error: "該單據已被接單或不再處於待處理狀態",
          code: "INVALID_PREVIOUS_STATUS",
        };
      }

      const { data: techProfile, error: techError } = await supabase
        .from("profiles")
        .select("id, user_role, display_name")
        .eq("id", options.technicianId)
        .maybeSingle();

      if (techError || !techProfile || techProfile.user_role !== "technician") {
        return {
          success: false,
          error: "所選使用者非有效技師",
          code: "VALIDATION_FAILED",
        };
      }

      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          status: "in_progress",
          assigned_to: options.technicianId,
        })
        .eq("id", ticketId)
        .eq("status", "pending");

      if (updateError) {
        console.error("Failed to assign ticket:", updateError);
        return {
          success: false,
          error: "指派技師失敗",
          code: "DATABASE_ERROR",
        };
      }

      const techName = techProfile.display_name || `技師 (${options.technicianId.slice(0, 8)})`;

      await supabase.from("ticket_notes").insert({
        ticket_id: ticketId,
        author_id: actor.userId,
        content: `管理者已指派此單據給 ${techName}`,
        type: "status_change",
      });

      if (!skipRevalidation) revalidateTicketPaths(ticketId);

      return {
        success: true,
        data: {
          ticketId,
          previousStatus: currentStatus,
          newStatus: "in_progress",
          assignedTo: options.technicianId,
        },
      };
    }

    case "submit_closure": {
      if (actor.type !== "technician" && actor.type !== "admin") {
        return {
          success: false,
          error: "僅指派技師或管理者可進行結案",
          code: "UNAUTHORIZED",
        };
      }

      if (currentStatus !== "in_progress") {
        return {
          success: false,
          error: "僅維修中的單據可進行結案作業",
          code: "INVALID_PREVIOUS_STATUS",
        };
      }

      if (actor.type === "technician" && ticket.assigned_to !== actor.userId) {
        return {
          success: false,
          error: "僅負責該單據的技師或管理者可進行結案",
          code: "UNAUTHORIZED",
        };
      }

      const { photosBase64, summary } = options;
      if (photosBase64.length === 0) {
        return {
          success: false,
          error: "結案需至少上傳 1 張完工證明照片",
          code: "VALIDATION_FAILED",
        };
      }

      if (photosBase64.length > 3) {
        return {
          success: false,
          error: "完工照片最多不可超過 3 張",
          code: "VALIDATION_FAILED",
        };
      }

      // Store closure photos
      const photoResult = await storeTicketPhotos(supabase, {
        ticketId,
        phase: "closure",
        photosBase64,
      });

      if (!photoResult.success) {
        return {
          success: false,
          error: photoResult.error ?? "結案照片上傳失敗",
          code: "PHOTO_UPLOAD_FAILED",
        };
      }

      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          status: "completed",
        })
        .eq("id", ticketId)
        .eq("status", "in_progress");

      if (updateError) {
        console.error("Failed to update ticket status to completed:", updateError);
        return {
          success: false,
          error: "更新單據狀態失敗",
          code: "DATABASE_ERROR",
        };
      }

      const closureNoteContent = summary?.trim() ? `已提交完工結案：${summary.trim()}` : "技師已完成維修並提交結案照片";

      await supabase.from("ticket_notes").insert({
        ticket_id: ticketId,
        author_id: actor.userId,
        content: closureNoteContent,
        type: "status_change",
      });

      if (!skipRevalidation) revalidateTicketPaths(ticketId);

      return {
        success: true,
        data: {
          ticketId,
          previousStatus: currentStatus,
          newStatus: "completed",
          assignedTo: ticket.assigned_to,
        },
      };
    }

    case "confirm_fix": {
      if (currentStatus !== "completed") {
        return {
          success: false,
          error: "僅已完工的報修單可進行確認結案",
          code: "INVALID_PREVIOUS_STATUS",
        };
      }

      if (actor.type === "reporter") {
        if (!actor.email || ticket.reporter_email.toLowerCase() !== actor.email.trim().toLowerCase()) {
          return {
            success: false,
            error: "電子郵件不符，無法操作此報修單",
            code: "UNAUTHORIZED",
          };
        }
      }

      const { error: updateError } = await supabase
        .from("tickets")
        .update({ status: "closed" })
        .eq("id", ticketId)
        .eq("status", "completed");

      if (updateError) {
        console.error("Failed to confirm fix:", updateError);
        return {
          success: false,
          error: "操作失敗，請稍後再試",
          code: "DATABASE_ERROR",
        };
      }

      const authorId = actor.type === "admin" || actor.type === "technician" ? actor.userId : null;
      const noteContent =
        actor.type === "system" ? "系統自動結案（完工逾 7 日無異議）" : "通報人已確認修復完成，報修單結案";

      await supabase.from("ticket_notes").insert({
        ticket_id: ticketId,
        author_id: authorId,
        content: noteContent,
        type: "status_change",
      });

      if (!skipRevalidation) revalidateTicketPaths(ticketId);

      return {
        success: true,
        data: {
          ticketId,
          previousStatus: currentStatus,
          newStatus: "closed",
          assignedTo: ticket.assigned_to,
        },
      };
    }

    case "reopen": {
      if (currentStatus !== "completed") {
        return {
          success: false,
          error: "僅已完工的報修單可重新開啟工單",
          code: "INVALID_PREVIOUS_STATUS",
        };
      }

      if (!options.feedback.trim()) {
        return {
          success: false,
          error: "請輸入問題反饋說明",
          code: "VALIDATION_FAILED",
        };
      }

      if (actor.type === "reporter") {
        if (!actor.email || ticket.reporter_email.toLowerCase() !== actor.email.trim().toLowerCase()) {
          return {
            success: false,
            error: "電子郵件不符，無法操作此報修單",
            code: "UNAUTHORIZED",
          };
        }
      }

      const { error: updateError } = await supabase
        .from("tickets")
        .update({ status: "in_progress" })
        .eq("id", ticketId)
        .eq("status", "completed");

      if (updateError) {
        console.error("Failed to reopen ticket:", updateError);
        return {
          success: false,
          error: "操作失敗，請稍後再試",
          code: "DATABASE_ERROR",
        };
      }

      const authorId = actor.type === "admin" || actor.type === "technician" ? actor.userId : null;

      await supabase.from("ticket_notes").insert({
        ticket_id: ticketId,
        author_id: authorId,
        content: `通報人反映問題仍在，已重新開啟工單：${options.feedback.trim()}`,
        type: "status_change",
      });

      if (!skipRevalidation) revalidateTicketPaths(ticketId);

      return {
        success: true,
        data: {
          ticketId,
          previousStatus: currentStatus,
          newStatus: "in_progress",
          assignedTo: ticket.assigned_to,
        },
      };
    }

    case "return_to_pending": {
      if (actor.type !== "admin") {
        return {
          success: false,
          error: "僅管理者可執行退回待處理",
          code: "UNAUTHORIZED",
        };
      }

      if (currentStatus !== "in_progress") {
        return {
          success: false,
          error: "僅維修中的單據可退回待處理",
          code: "INVALID_PREVIOUS_STATUS",
        };
      }

      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          status: "pending",
          assigned_to: null,
        })
        .eq("id", ticketId)
        .eq("status", "in_progress");

      if (updateError) {
        console.error("Failed to return ticket to pending:", updateError);
        return {
          success: false,
          error: "退回待處理失敗",
          code: "DATABASE_ERROR",
        };
      }

      await supabase.from("ticket_notes").insert({
        ticket_id: ticketId,
        author_id: actor.userId,
        content: "管理者已將此單據退回待處理狀態（清除指派技師）",
        type: "status_change",
      });

      if (!skipRevalidation) revalidateTicketPaths(ticketId);

      return {
        success: true,
        data: {
          ticketId,
          previousStatus: currentStatus,
          newStatus: "pending",
          assignedTo: null,
        },
      };
    }

    case "cancel": {
      if (actor.type !== "admin") {
        return {
          success: false,
          error: "僅管理者可取消報修單據",
          code: "UNAUTHORIZED",
        };
      }

      if (!options.reason.trim()) {
        return {
          success: false,
          error: "請輸入取消原因",
          code: "VALIDATION_FAILED",
        };
      }

      if (currentStatus !== "pending" && currentStatus !== "in_progress") {
        return {
          success: false,
          error: "僅待處理或維修中的單據可被取消",
          code: "INVALID_PREVIOUS_STATUS",
        };
      }

      const { error: updateError } = await supabase.from("tickets").update({ status: "cancelled" }).eq("id", ticketId);

      if (updateError) {
        console.error("Failed to cancel ticket:", updateError);
        return {
          success: false,
          error: "取消單據失敗",
          code: "DATABASE_ERROR",
        };
      }

      await supabase.from("ticket_notes").insert({
        ticket_id: ticketId,
        author_id: actor.userId,
        content: `管理者已取消此單據，原因：${options.reason.trim()}`,
        type: "status_change",
      });

      if (!skipRevalidation) revalidateTicketPaths(ticketId);

      return {
        success: true,
        data: {
          ticketId,
          previousStatus: currentStatus,
          newStatus: "cancelled",
          assignedTo: ticket.assigned_to,
        },
      };
    }

    default: {
      return {
        success: false,
        error: "不支援的狀態轉換操作",
        code: "VALIDATION_FAILED",
      };
    }
  }
}
