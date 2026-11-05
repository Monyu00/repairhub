import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import type { ReportData } from "../_components/report-types";
import { fetchReportDataWithClient } from "./report-data";

export async function fetchReportData(filterParams?: {
  range?: string;
  from?: string;
  to?: string;
}): Promise<ReportData> {
  return fetchReportDataWithClient(createAdminClient(), filterParams);
}
