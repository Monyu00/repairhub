import type { TicketDetail } from "./detail";

type TicketDetailActionName = "assign" | "cancel" | "returnToPending" | "claim" | "closure" | "progressNote";

export interface TicketDetailActionCapability {
  enabled: boolean;
  disabledReason: string | null;
}

export type TicketDetailCapabilities = Record<TicketDetailActionName, TicketDetailActionCapability>;

export interface TicketDetailViewer {
  role: "admin" | "technician" | null;
  userId: string | null;
}

function capability(enabled: boolean, disabledReason: string): TicketDetailActionCapability {
  return { enabled, disabledReason: enabled ? null : disabledReason };
}

export function getTicketDetailCapabilities(
  detail: TicketDetail,
  viewer: TicketDetailViewer,
): TicketDetailCapabilities {
  const { status } = detail.ticket;
  const { role, userId } = viewer;
  const isAssignedTech = role === "technician" && userId !== null && detail.ticket.assignedTo === userId;

  const claimReason = (() => {
    if (role === "technician") {
      if (status === "in_progress") {
        return isAssignedTech ? "您已接此單據（維修中）" : "此案件已被其他技師接單處理中";
      }
      if (status === "completed") return "此案件維修已完工";
      if (status === "closed") return "此案件已結案";
      if (status === "cancelled") return "此案件已取消";
      return "此案件已被接單或不再處於待處理狀態";
    }

    return "僅技師身分可進行接單";
  })();

  const closureReason = (() => {
    if (!role) return "僅指派技師或管理者可進行結案";
    if (status !== "in_progress") return "僅維修中的單據可進行結案作業";
    if (role === "technician" && !isAssignedTech) return "僅指派技師或管理者可進行結案";
    return "僅維修中的單據可進行結案作業";
  })();

  return {
    assign: capability(role === "admin" && status === "pending", "僅待處理的單據可指派技師"),
    cancel: capability(
      role === "admin" && (status === "pending" || status === "in_progress"),
      "僅待處理或維修中的單據可被取消",
    ),
    returnToPending: capability(role === "admin" && status === "in_progress", "僅維修中的單據可退回待處理"),
    claim: capability(role === "technician" && status === "pending", claimReason),
    closure: capability((role === "admin" || isAssignedTech) && status === "in_progress", closureReason),
    progressNote: capability(role === "admin" || isAssignedTech, "無權限為此單據新增進度備註"),
  };
}
