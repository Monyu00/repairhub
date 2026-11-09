import { createElement } from "react";

import { renderToStaticMarkup } from "react-dom/server";

import { UserRoleOption } from "./user-role-option";
import assert from "node:assert/strict";
import test from "node:test";

const ROLE_ORDER = ["user", "technician", "admin"] as const;

test("user role options use Traditional Chinese labels and semantic icon colors", () => {
  const html = ROLE_ORDER.map((userRole) => renderToStaticMarkup(createElement(UserRoleOption, { userRole }))).join("");

  for (const label of ["一般使用者", "維修技師", "系統管理者"]) {
    assert.match(html, new RegExp(`<span>${label}</span>`));
  }

  assert.doesNotMatch(html, /\((?:User|Technician|Admin)\)/);
  assert.doesNotMatch(html, /text-(?:slate|rose)-\d/);
});
