import type { FormState } from "../actions";

export type ReportFieldErrors = FormState["fieldErrors"];

const ERROR_ID_PREFIX = "report-error-";

export function errorIdForField(field: string) {
  return `${ERROR_ID_PREFIX}${field}`;
}

export function applyFieldErrors(form: HTMLFormElement, errors: ReportFieldErrors) {
  for (const control of form.querySelectorAll<HTMLElement>("[aria-describedby]")) {
    control.removeAttribute("aria-describedby");
  }

  if (!errors) return null;

  for (const field of Object.keys(errors)) {
    const control = form.querySelector<HTMLElement>(`#${field}`);
    const error = document.getElementById(errorIdForField(field));
    if (!control || !error) continue;

    control.setAttribute("aria-describedby", error.id);
  }

  return form.querySelector<HTMLElement>("[aria-describedby]");
}
