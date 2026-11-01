import { applyFieldErrors, errorIdForField } from "./report-form-errors";
import assert from "node:assert/strict";
import test from "node:test";

test("errorIdForField builds the id used by the server error message", () => {
  assert.equal(errorIdForField("reporter_email"), "report-error-reporter_email");
});

test("applyFieldErrors focuses the first invalid field in DOM order", () => {
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  const buildingControl = {
    id: "building_id",
    describedBy: "",
    removeAttribute: () => {
      buildingControl.describedBy = "";
    },
    setAttribute: (_name: string, value: string) => {
      buildingControl.describedBy = value;
    },
  };
  const emailControl = {
    id: "reporter_email",
    describedBy: "",
    removeAttribute: () => {
      emailControl.describedBy = "";
    },
    setAttribute: (_name: string, value: string) => {
      emailControl.describedBy = value;
    },
  };

  function selectControl(selector: string) {
    if (selector === "[aria-describedby]") {
      return [buildingControl, emailControl].find((control) => control.describedBy) ?? null;
    }

    if (selector === "#reporter_email") {
      return emailControl;
    }

    return buildingControl;
  }

  const form = {
    querySelectorAll: (selector: string) => (selector === "[aria-describedby]" ? [buildingControl, emailControl] : []),
    querySelector: selectControl,
  } as unknown as HTMLFormElement;

  Reflect.set(globalThis, "document", {
    getElementById: (id: string) => ({ id }) as HTMLElement,
  });

  try {
    const firstInvalidControl = applyFieldErrors(form, {
      reporter_email: "電子郵件格式不正確",
      building_id: "請選擇地點",
    });

    assert.equal(firstInvalidControl, buildingControl);
    assert.equal(buildingControl.describedBy, "report-error-building_id");
    assert.equal(emailControl.describedBy, "report-error-reporter_email");
  } finally {
    Reflect.deleteProperty(globalThis, "document");
    if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor);
  }
});

test("applyFieldErrors returns null when there are no field errors", () => {
  const form = { querySelectorAll: () => [], querySelector: () => null } as unknown as HTMLFormElement;

  assert.equal(applyFieldErrors(form, undefined), null);
  assert.equal(applyFieldErrors(form, {}), null);
});
