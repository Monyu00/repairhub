import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { fetchReportDataWithClient } from "./report-data";

export async function fetchReportData(filterParams?: {
  range?: string;
  from?: string;
  to?: string;
}): Promise<import("../_components/report-types").ReportData> {
  return fetchReportDataWithClient(createAdminClient(), filterParams);
}
