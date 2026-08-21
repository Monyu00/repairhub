import { toast } from "sonner";

import type { ReportData } from "./report-types";

/**
 * Formats a Date object into YYYYMMDD string for filenames
 */
function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Generates and downloads an Excel file (.xlsx) containing all report data sections in structured sheets.
 */
export async function exportReportToExcel(data: ReportData): Promise<void> {
  const toastId = toast.loading("正在產生 Excel 報表試算表...");

  try {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    // 1. Sheet 1: 總覽摘要 (KPIs)
    const kpiRows = [
      { 項目: "統計時間範圍", 數值: data.kpi.activePeriodLabel, 備註: `篩選設定: ${data.filter.preset}` },
      { 項目: "期間工單總數", 數值: data.kpi.totalTickets, 備註: "件" },
      { 項目: "已完成/結案數", 數值: data.kpi.completedOrClosedCount, 備註: "件" },
      { 項目: "待處理工單數", 數值: data.kpi.pendingCount, 備註: "件" },
      { 項目: "處理中工單數", 數值: data.kpi.inProgressCount, 備註: "件" },
      { 項目: "結案率", 數值: `${data.kpi.completionRate}%`, 備註: "已完成工單佔總數比例" },
      { 項目: "平均修復天數", 數值: `${data.kpi.overallAvgDaysToResolve} 天`, 備註: "從通報至完工平均耗時" },
      { 項目: "報表匯出時間", 數值: new Date().toLocaleString("zh-TW"), 備註: "系統自動產出" },
    ];
    const wsKpi = XLSX.utils.json_to_sheet(kpiRows);
    wsKpi["!cols"] = [{ wch: 18 }, { wch: 24 }, { wch: 26 }];
    XLSX.utils.book_append_sheet(wb, wsKpi, "總覽摘要");

    // 2. Sheet 2: 每月工單趨勢 (Monthly Volume)
    const monthlyRows = data.monthlyTrends.map((item) => ({
      月份: item.month,
      工單總數: item.total,
      已完成件數: item.completed,
      待處理或進行中: item.pendingOrProgress,
      完工率: item.total > 0 ? `${Math.round((item.completed / item.total) * 1000) / 10}%` : "0%",
    }));
    const wsMonthly = XLSX.utils.json_to_sheet(monthlyRows.length > 0 ? monthlyRows : [{ 狀態: "無資料" }]);
    wsMonthly["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsMonthly, "每月工單趨勢");

    // 3. Sheet 3: 建築物分佈 (Building Distribution)
    const buildingRows = data.buildingDistribution.map((item) => ({
      大樓名稱: item.buildingName,
      大樓代碼: item.buildingCode,
      工單數量: item.count,
      佔比: `${item.percentage}%`,
    }));
    const wsBuilding = XLSX.utils.json_to_sheet(buildingRows.length > 0 ? buildingRows : [{ 狀態: "無資料" }]);
    wsBuilding["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsBuilding, "建築物分佈");

    // 4. Sheet 4: 維修分類佔比 (Category Distribution)
    const categoryRows = data.categoryDistribution.map((item) => ({
      分類名稱: item.categoryName,
      工單數量: item.count,
      佔比: `${item.percentage}%`,
    }));
    const wsCategory = XLSX.utils.json_to_sheet(categoryRows.length > 0 ? categoryRows : [{ 狀態: "無資料" }]);
    wsCategory["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsCategory, "維修分類佔比");

    // 5. Sheet 5: 平均修復時效 (Resolution Times)
    const resolutionRows = data.resolutionTrends.map((item) => ({
      月份: item.month,
      已結案件數: item.completedCount,
      平均修復天數: item.avgDays,
      平均修復時數: item.avgHours,
    }));
    const wsResolution = XLSX.utils.json_to_sheet(resolutionRows.length > 0 ? resolutionRows : [{ 狀態: "無資料" }]);
    wsResolution["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsResolution, "平均修復時效");

    // 6. Sheet 6: 技師維修績效 (Technician Metrics)
    const technicianRows = data.technicianPerformance.map((item) => ({
      技師姓名: item.displayName,
      已完工件數: item.completedCount,
      處理中件數: item.inProgressCount,
      平均修復天數: `${item.avgDaysToResolve} 天`,
    }));
    const wsTechnician = XLSX.utils.json_to_sheet(technicianRows.length > 0 ? technicianRows : [{ 狀態: "無資料" }]);
    wsTechnician["!cols"] = [{ wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsTechnician, "技師績效");

    // Filename: repairhub-report-{preset}-{YYYYMMDD}.xlsx
    const preset = data.filter.preset;
    const filename = `repairhub-report-${preset}-${getTodayString()}.xlsx`;

    XLSX.writeFile(wb, filename);

    toast.success("Excel 報表匯出成功！", { id: toastId });
  } catch (error) {
    console.error("Failed to export Excel report:", error);
    toast.error("匯出 Excel 報表失敗，請稍後再試", { id: toastId });
  }
}
