import { isValidElement, type ReactNode } from "react";

import ChangePasswordLayout from "../(main)/change-password/layout";
import UnauthorizedPage from "../(main)/unauthorized/page";
import CheckEmailPage from "./check-email/page";
import ForgotPasswordPage from "./forgot-password/page";
import ResetPasswordPage from "./reset-password/page";
import assert from "node:assert/strict";
import test from "node:test";

function countMainLandmarks(node: ReactNode): number {
  if (Array.isArray(node)) {
    return node.reduce((count, child) => count + countMainLandmarks(child), 0);
  }

  if (!isValidElement<{ children?: ReactNode }>(node)) {
    return 0;
  }

  return (node.type === "main" ? 1 : 0) + countMainLandmarks(node.props.children);
}

const standalonePages = [
  ["forgot password", ForgotPasswordPage],
  ["reset password", ResetPasswordPage],
  ["check email", CheckEmailPage],
  ["unauthorized", UnauthorizedPage],
] as const;

for (const [name, Page] of standalonePages) {
  test(`${name} page exposes exactly one main landmark`, () => {
    assert.equal(countMainLandmarks(Page()), 1);
  });
}

test("change password page exposes exactly one main landmark", () => {
  assert.equal(countMainLandmarks(ChangePasswordLayout({ children: null })), 1);
});
