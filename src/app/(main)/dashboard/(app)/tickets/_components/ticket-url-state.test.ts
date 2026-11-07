import { parseTicketSortParam, toggleTicketSortParam } from "./ticket-url-state";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("parseTicketSortParam", () => {
  it("defaults to newest created_at when the param is missing", () => {
    assert.deepEqual(parseTicketSortParam(undefined), { field: "created_at", ascending: false });
  });

  it("parses ascending created_at", () => {
    assert.deepEqual(parseTicketSortParam("created_at_asc"), { field: "created_at", ascending: true });
  });

  it("parses updated_at sort", () => {
    assert.deepEqual(parseTicketSortParam("updated_at_desc"), { field: "updated_at", ascending: false });
  });

  it("falls back to the default for unknown values", () => {
    assert.deepEqual(parseTicketSortParam("hacker"), { field: "created_at", ascending: false });
  });
});

describe("toggleTicketSortParam", () => {
  it("toggles created_at direction", () => {
    assert.equal(toggleTicketSortParam("created_at_asc"), "created_at_desc");
    assert.equal(toggleTicketSortParam("created_at_desc"), "created_at_asc");
  });

  it("starts at ascending created_at when another field is active", () => {
    assert.equal(toggleTicketSortParam("updated_at_desc"), "created_at_asc");
  });

  it("starts at ascending created_at when unset", () => {
    assert.equal(toggleTicketSortParam(undefined), "created_at_asc");
  });
});
