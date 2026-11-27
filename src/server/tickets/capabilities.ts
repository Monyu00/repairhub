import type { TicketDetail } from "./detail";

type TicketDetailActionName = "assign" | "cancel" | "returnToPending" | "claim" | "closure" | "progressNote";

export interface TicketDetailActionCapability {
  enabled: boolean;
  disabledReason: string | null;
}

export type TicketDetailCapabilities = Record<TicketDetailActionName, TicketDetailActionCapability>;

export type TicketTransitionDecision =
  | {
      enabled: true;
      disabledReason: null;
      transitionError: null;
      errorCode: null;
    }
  | {
      enabled: false;
      disabledReason: string;
      transitionError: string;
      errorCode: "UNAUTHORIZED" | "INVALID_PREVIOUS_STATUS";
    };

export interface TicketDetailViewer {
  role: "admin" | "technician" | null;
  userId: string | null;
}

export type TicketProgressNoteFacts = Pick<TicketDetail["ticket"], "assignedTo">;

export type TicketTransitionFacts = Pick<TicketDetail["ticket"], "status" | "assignedTo">;

function capability(enabled: boolean, disabledReason: string): TicketDetailActionCapability {
  return { enabled, disabledReason: enabled ? null : disabledReason };
}

function transitionCapability(
  disabledReason: string,
  roleAllowed: boolean,
  statusAllowed: boolean,
  unauthorizedError: string,
  invalidStatusError: string,
): TicketTransitionDecision {
  if (!roleAllowed) {
    return { enabled: false, disabledReason, transitionError: unauthorizedError, errorCode: "UNAUTHORIZED" };
  }

  if (!statusAllowed) {
    return {
      enabled: false,
      disabledReason,
      transitionError: invalidStatusError,
      errorCode: "INVALID_PREVIOUS_STATUS",
    };
  }

  return { enabled: true, disabledReason: null, transitionError: null, errorCode: null };
}

function detailCapability({ enabled, disabledReason }: TicketTransitionDecision): TicketDetailActionCapability {
  return { enabled, disabledReason };
}

function isAssignedTechnician(ticket: { assignedTo: string | null }, viewer: TicketDetailViewer): boolean {
  return viewer.role === "technician" && viewer.userId !== null && ticket.assignedTo === viewer.userId;
}

export function getProgressNoteCapability(
  ticket: TicketProgressNoteFacts,
  viewer: TicketDetailViewer,
): TicketDetailActionCapability {
  const isAssignedTech = isAssignedTechnician(ticket, viewer);

  return capability(viewer.role === "admin" || isAssignedTech, "無權限為此單據新增進度備註");
}

export function getTicketTransitionCapability(
  ticket: TicketTransitionFacts,
  viewer: TicketDetailViewer,
  transition: "assign" | "cancel" | "returnToPending" | "claim" | "closure",
): TicketTransitionDecision {
  const { status } = ticket;
  const { role } = viewer;

  switch (transition) {
    case "claim": {
      const isAssignedTech = isAssignedTechnician(ticket, viewer);
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
      return transitionCapability(
        claimReason,
        role === "technician",
        status === "pending",
        "僅技師身分可進行接單",
        "此案件已被接單或不再處於待處理狀態",
      );
    }
    case "assign":
      return transitionCapability(
        "僅待處理的單據可指派技師",
        role === "admin",
        status === "pending",
        "僅管理者可執行指派技師",
        "該單據已被接單或不再處於待處理狀態",
      );
    case "cancel":
      return transitionCapability(
        "僅待處理或維修中的單據可被取消",
        role === "admin",
        status === "pending" || status === "in_progress",
        "僅管理者可取消報修單據",
        "僅待處理或維修中的單據可被取消",
      );
    case "closure": {
      const isAssignedTech = isAssignedTechnician(ticket, viewer);
      const closureReason = (() => {
        if (!role) return "僅指派技師或管理者可進行結案";
        if (status !== "in_progress") return "僅維修中的單據可進行結案作業";
        if (role === "technician" && !isAssignedTech) return "僅指派技師或管理者可進行結案";
        return "僅維修中的單據可進行結案作業";
      })();
      const decision = transitionCapability(
        closureReason,
        role === "admin" || role === "technician",
        status === "in_progress",
        "僅指派技師或管理者可進行結案",
        "僅維修中的單據可進行結案作業",
      );
      if (decision.enabled && role === "technician" && !isAssignedTech) {
        return {
          enabled: false,
          disabledReason: closureReason,
          transitionError: "僅負責該單據的技師或管理者可進行結案",
          errorCode: "UNAUTHORIZED",
        };
      }
      return decision;
    }
    case "returnToPending":
      return transitionCapability(
        "僅維修中的單據可退回待處理",
        role === "admin",
        status === "in_progress",
        "僅管理者可執行退回待處理",
        "僅維修中的單據可退回待處理",
      );
  }
}

export function getTicketDetailCapabilities(
  detail: TicketDetail,
  viewer: TicketDetailViewer,
): TicketDetailCapabilities {
  return {
    assign: detailCapability(getTicketTransitionCapability(detail.ticket, viewer, "assign")),
    cancel: detailCapability(getTicketTransitionCapability(detail.ticket, viewer, "cancel")),
    returnToPending: detailCapability(getTicketTransitionCapability(detail.ticket, viewer, "returnToPending")),
    claim: detailCapability(getTicketTransitionCapability(detail.ticket, viewer, "claim")),
    closure: detailCapability(getTicketTransitionCapability(detail.ticket, viewer, "closure")),
    progressNote: getProgressNoteCapability(detail.ticket, viewer),
  };
}
