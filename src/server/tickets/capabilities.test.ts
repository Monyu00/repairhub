import { getTicketDetailCapabilities } from "./capabilities";
import type { TicketDetail } from "./detail";
import assert from "node:assert/strict";
import test from "node:test";

const statuses = ["pending", "in_progress", "completed", "closed", "cancelled"] as const;

function createDetail(status: (typeof statuses)[number], assignedTo: string): TicketDetail {
  return {
    ticket: {
      id: "ticket-1",
      status,
      categoryId: "category-1",
      category: { id: "category-1", name: "電子設備" },
      buildingId: "building-1",
      building: { id: "building-1", name: "管理大樓", code: "ADMIN" },
      spaceId: null,
      space: null,
      description: "投影機無法啟動",
      equipmentId: null,
      equipmentName: null,
      reporterName: null,
      reporterDepartment: null,
      reporterEmail: null,
      reporterPhone: null,
      assignedTo,
      assignedTechnician: { id: assignedTo, displayName: "技師" },
      technicianName: "技師",
      rating: null,
      ratedAt: null,
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    photos: [],
    notes: [],
  };
}

const claimOnlyAdminReason = "僅技師身分可進行接單";
const closureOnlyStatusReason = "僅維修中的單據可進行結案作業";
const noPermissionReason = "無權限為此單據新增進度備註";
const assignedClaimReason = "您已接此單據（維修中）";
const otherTechnicianClaimReason = "此案件已被其他技師接單處理中";

const expected = {
  admin: {
    pending: {
      assign: { enabled: true, disabledReason: null },
      cancel: { enabled: true, disabledReason: null },
      returnToPending: { enabled: false, disabledReason: "僅維修中的單據可退回待處理" },
      claim: { enabled: false, disabledReason: claimOnlyAdminReason },
      closure: { enabled: false, disabledReason: closureOnlyStatusReason },
      progressNote: { enabled: true, disabledReason: null },
    },
    in_progress: {
      assign: { enabled: false, disabledReason: "僅待處理的單據可指派技師" },
      cancel: { enabled: true, disabledReason: null },
      returnToPending: { enabled: true, disabledReason: null },
      claim: { enabled: false, disabledReason: claimOnlyAdminReason },
      closure: { enabled: true, disabledReason: null },
      progressNote: { enabled: true, disabledReason: null },
    },
    completed: {
      assign: { enabled: false, disabledReason: "僅待處理的單據可指派技師" },
      cancel: { enabled: false, disabledReason: "僅待處理或維修中的單據可被取消" },
      returnToPending: { enabled: false, disabledReason: "僅維修中的單據可退回待處理" },
      claim: { enabled: false, disabledReason: claimOnlyAdminReason },
      closure: { enabled: false, disabledReason: closureOnlyStatusReason },
      progressNote: { enabled: true, disabledReason: null },
    },
    closed: {
      assign: { enabled: false, disabledReason: "僅待處理的單據可指派技師" },
      cancel: { enabled: false, disabledReason: "僅待處理或維修中的單據可被取消" },
      returnToPending: { enabled: false, disabledReason: "僅維修中的單據可退回待處理" },
      claim: { enabled: false, disabledReason: claimOnlyAdminReason },
      closure: { enabled: false, disabledReason: closureOnlyStatusReason },
      progressNote: { enabled: true, disabledReason: null },
    },
    cancelled: {
      assign: { enabled: false, disabledReason: "僅待處理的單據可指派技師" },
      cancel: { enabled: false, disabledReason: "僅待處理或維修中的單據可被取消" },
      returnToPending: { enabled: false, disabledReason: "僅維修中的單據可退回待處理" },
      claim: { enabled: false, disabledReason: claimOnlyAdminReason },
      closure: { enabled: false, disabledReason: closureOnlyStatusReason },
      progressNote: { enabled: true, disabledReason: null },
    },
  },
  assignedTechnician: {
    pending: {
      assign: { enabled: false, disabledReason: "僅待處理的單據可指派技師" },
      cancel: { enabled: false, disabledReason: "僅待處理或維修中的單據可被取消" },
      returnToPending: { enabled: false, disabledReason: "僅維修中的單據可退回待處理" },
      claim: { enabled: true, disabledReason: null },
      closure: { enabled: false, disabledReason: closureOnlyStatusReason },
      progressNote: { enabled: true, disabledReason: null },
    },
    in_progress: {
      assign: { enabled: false, disabledReason: "僅待處理的單據可指派技師" },
      cancel: { enabled: false, disabledReason: "僅待處理或維修中的單據可被取消" },
      returnToPending: { enabled: false, disabledReason: "僅維修中的單據可退回待處理" },
      claim: { enabled: false, disabledReason: assignedClaimReason },
      closure: { enabled: true, disabledReason: null },
      progressNote: { enabled: true, disabledReason: null },
    },
    completed: {
      assign: { enabled: false, disabledReason: "僅待處理的單據可指派技師" },
      cancel: { enabled: false, disabledReason: "僅待處理或維修中的單據可被取消" },
      returnToPending: { enabled: false, disabledReason: "僅維修中的單據可退回待處理" },
      claim: { enabled: false, disabledReason: "此案件維修已完工" },
      closure: { enabled: false, disabledReason: closureOnlyStatusReason },
      progressNote: { enabled: true, disabledReason: null },
    },
    closed: {
      assign: { enabled: false, disabledReason: "僅待處理的單據可指派技師" },
      cancel: { enabled: false, disabledReason: "僅待處理或維修中的單據可被取消" },
      returnToPending: { enabled: false, disabledReason: "僅維修中的單據可退回待處理" },
      claim: { enabled: false, disabledReason: "此案件已結案" },
      closure: { enabled: false, disabledReason: closureOnlyStatusReason },
      progressNote: { enabled: true, disabledReason: null },
    },
    cancelled: {
      assign: { enabled: false, disabledReason: "僅待處理的單據可指派技師" },
      cancel: { enabled: false, disabledReason: "僅待處理或維修中的單據可被取消" },
      returnToPending: { enabled: false, disabledReason: "僅維修中的單據可退回待處理" },
      claim: { enabled: false, disabledReason: "此案件已取消" },
      closure: { enabled: false, disabledReason: closureOnlyStatusReason },
      progressNote: { enabled: true, disabledReason: null },
    },
  },
  unassignedTechnician: {
    pending: {
      assign: { enabled: false, disabledReason: "僅待處理的單據可指派技師" },
      cancel: { enabled: false, disabledReason: "僅待處理或維修中的單據可被取消" },
      returnToPending: { enabled: false, disabledReason: "僅維修中的單據可退回待處理" },
      claim: { enabled: true, disabledReason: null },
      closure: { enabled: false, disabledReason: closureOnlyStatusReason },
      progressNote: { enabled: false, disabledReason: noPermissionReason },
    },
    in_progress: {
      assign: { enabled: false, disabledReason: "僅待處理的單據可指派技師" },
      cancel: { enabled: false, disabledReason: "僅待處理或維修中的單據可被取消" },
      returnToPending: { enabled: false, disabledReason: "僅維修中的單據可退回待處理" },
      claim: { enabled: false, disabledReason: otherTechnicianClaimReason },
      closure: { enabled: false, disabledReason: "僅指派技師或管理者可進行結案" },
      progressNote: { enabled: false, disabledReason: noPermissionReason },
    },
    completed: {
      assign: { enabled: false, disabledReason: "僅待處理的單據可指派技師" },
      cancel: { enabled: false, disabledReason: "僅待處理或維修中的單據可被取消" },
      returnToPending: { enabled: false, disabledReason: "僅維修中的單據可退回待處理" },
      claim: { enabled: false, disabledReason: "此案件維修已完工" },
      closure: { enabled: false, disabledReason: closureOnlyStatusReason },
      progressNote: { enabled: false, disabledReason: noPermissionReason },
    },
    closed: {
      assign: { enabled: false, disabledReason: "僅待處理的單據可指派技師" },
      cancel: { enabled: false, disabledReason: "僅待處理或維修中的單據可被取消" },
      returnToPending: { enabled: false, disabledReason: "僅維修中的單據可退回待處理" },
      claim: { enabled: false, disabledReason: "此案件已結案" },
      closure: { enabled: false, disabledReason: closureOnlyStatusReason },
      progressNote: { enabled: false, disabledReason: noPermissionReason },
    },
    cancelled: {
      assign: { enabled: false, disabledReason: "僅待處理的單據可指派技師" },
      cancel: { enabled: false, disabledReason: "僅待處理或維修中的單據可被取消" },
      returnToPending: { enabled: false, disabledReason: "僅維修中的單據可退回待處理" },
      claim: { enabled: false, disabledReason: "此案件已取消" },
      closure: { enabled: false, disabledReason: closureOnlyStatusReason },
      progressNote: { enabled: false, disabledReason: noPermissionReason },
    },
  },
} as const;

test("Capabilities derive from role, assignment, and every Ticket status", () => {
  const viewers = {
    admin: { role: "admin" as const, userId: "admin-1" },
    assignedTechnician: { role: "technician" as const, userId: "technician-1" },
    unassignedTechnician: { role: "technician" as const, userId: "technician-2" },
  };

  for (const status of statuses) {
    const detail = createDetail(status, "technician-1");
    assert.deepEqual(getTicketDetailCapabilities(detail, viewers.admin), expected.admin[status]);
    assert.deepEqual(
      getTicketDetailCapabilities(detail, viewers.assignedTechnician),
      expected.assignedTechnician[status],
    );
    assert.deepEqual(
      getTicketDetailCapabilities(detail, viewers.unassignedTechnician),
      expected.unassignedTechnician[status],
    );
  }
});
