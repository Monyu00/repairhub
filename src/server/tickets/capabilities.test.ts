import { getTicketDetailCapabilities } from "./capabilities";
import type { TicketDetail } from "./detail";
import assert from "node:assert/strict";
import test from "node:test";

const statuses = ["pending", "in_progress", "completed", "closed", "cancelled"] as const;

function createDetail(status: (typeof statuses)[number]): TicketDetail {
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
      assignedTo: "technician-1",
      assignedTechnician: { id: "technician-1", displayName: "技師" },
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

function assertCapability(
  capability: { enabled: boolean; disabledReason: string | null },
  enabled: boolean,
  reason = "",
) {
  assert.equal(capability.enabled, enabled);
  assert.equal(capability.disabledReason ?? "", reason);
}

test("Admin can assign and cancel a Pending Ticket", () => {
  const capabilities = getTicketDetailCapabilities(createDetail("pending"), { role: "admin", userId: "admin-1" });

  assertCapability(capabilities.assign, true);
  assertCapability(capabilities.cancel, true);
  assertCapability(capabilities.returnToPending, false, "僅維修中的單據可退回待處理");
  assertCapability(capabilities.claim, false, "僅技師身分可進行接單");
  assertCapability(capabilities.closure, false, "僅維修中的單據可進行結案作業");
  assertCapability(capabilities.progressNote, true);
});

test("Admin can cancel, return to Pending, close, and note an In Progress Ticket", () => {
  const capabilities = getTicketDetailCapabilities(createDetail("in_progress"), { role: "admin", userId: "admin-1" });

  assertCapability(capabilities.assign, false, "僅待處理的單據可指派技師");
  assertCapability(capabilities.cancel, true);
  assertCapability(capabilities.returnToPending, true);
  assertCapability(capabilities.claim, false, "僅技師身分可進行接單");
  assertCapability(capabilities.closure, true);
  assertCapability(capabilities.progressNote, true);
});

test("Admin can only add notes to a Completed Ticket", () => {
  const capabilities = getTicketDetailCapabilities(createDetail("completed"), { role: "admin", userId: "admin-1" });

  assertCapability(capabilities.assign, false, "僅待處理的單據可指派技師");
  assertCapability(capabilities.cancel, false, "僅待處理或維修中的單據可被取消");
  assertCapability(capabilities.returnToPending, false, "僅維修中的單據可退回待處理");
  assertCapability(capabilities.claim, false, "僅技師身分可進行接單");
  assertCapability(capabilities.closure, false, "僅維修中的單據可進行結案作業");
  assertCapability(capabilities.progressNote, true);
});

test("Admin can only add notes to a Closed Ticket", () => {
  const capabilities = getTicketDetailCapabilities(createDetail("closed"), { role: "admin", userId: "admin-1" });

  assertCapability(capabilities.assign, false, "僅待處理的單據可指派技師");
  assertCapability(capabilities.cancel, false, "僅待處理或維修中的單據可被取消");
  assertCapability(capabilities.returnToPending, false, "僅維修中的單據可退回待處理");
  assertCapability(capabilities.claim, false, "僅技師身分可進行接單");
  assertCapability(capabilities.closure, false, "僅維修中的單據可進行結案作業");
  assertCapability(capabilities.progressNote, true);
});

test("Admin can only add notes to a Cancelled Ticket", () => {
  const capabilities = getTicketDetailCapabilities(createDetail("cancelled"), { role: "admin", userId: "admin-1" });

  assertCapability(capabilities.assign, false, "僅待處理的單據可指派技師");
  assertCapability(capabilities.cancel, false, "僅待處理或維修中的單據可被取消");
  assertCapability(capabilities.returnToPending, false, "僅維修中的單據可退回待處理");
  assertCapability(capabilities.claim, false, "僅技師身分可進行接單");
  assertCapability(capabilities.closure, false, "僅維修中的單據可進行結案作業");
  assertCapability(capabilities.progressNote, true);
});

test("Capability rules cover every Ticket status without runtime dependencies", () => {
  for (const status of statuses) {
    const capabilities = getTicketDetailCapabilities(createDetail(status), { role: "admin", userId: "admin-1" });

    for (const capability of Object.values(capabilities)) {
      assert.equal(typeof capability.enabled, "boolean");
      assert.ok(capability.disabledReason === null || typeof capability.disabledReason === "string");
    }
  }
});
