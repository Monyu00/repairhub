import { renderToStaticMarkup } from "react-dom/server";

import { useUser } from "@/hooks/use-user";
import type { UserProjection } from "@/lib/users/projection";

import { UserProjectionProvider } from "./user-projection-provider";
import assert from "node:assert/strict";
import test from "node:test";

function IdentityProbe() {
  const projection = useUser();

  return <span>{projection ? `${projection.email}|${projection.role ?? "none"}` : "anonymous"}</span>;
}

const projection: UserProjection = {
  id: "user-1",
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin",
  department: null,
  phone: null,
  avatarUrl: null,
  isActive: true,
  mustChangePassword: false,
};

test("exposes the server-rendered projection to consumers", () => {
  const html = renderToStaticMarkup(
    <UserProjectionProvider projection={projection}>
      <IdentityProbe />
    </UserProjectionProvider>,
  );

  assert.equal(html, "<span>admin@example.com|admin</span>");
});

test("degrades safely to no identity when no projection is provided", () => {
  const html = renderToStaticMarkup(<IdentityProbe />);

  assert.equal(html, "<span>anonymous</span>");
});
