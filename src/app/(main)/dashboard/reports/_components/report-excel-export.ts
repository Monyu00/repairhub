import type { Workbook } from "exceljs";
import { toast } from "sonner";

import type { ReportData } from "./report-types";

interface ExcelColumn {
  header: string;
  key: string;
  width: number;
}

type ExcelRow = Record<string, string | number>;

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

function addReportWorksheet(workbook: Workbook, name: string, rows: ExcelRow[], columns: ExcelColumn[]) {
  const worksheet = workbook.addWorksheet(name);

  if (rows.length === 0) {
    worksheet.columns = [{ header: "狀態", key: "狀態", width: 16 }];
    worksheet.addRow({ 狀態: "無資料" });
    return;
  }

  worksheet.columns = columns;
  worksheet.addRows(rows);
}

/**
 * Generates and downloads an Excel file (.xlsx) containing all report data sections in structured sheets.
 */
export async function exportReportToExcel(data: ReportData): Promise<void> {
  const toastId = toast.loading("正在產生 Excel 報表試算表...");

  try {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();

    // 1. Sheet 1: 總覽摘要 (KPIs)
    const kpiRows = [
      { 項目: "統計時間範圍", 數值: data.kpi.activePeriodLabel, 備註: `篩選設定: ${data.filter.preset}` },
      { 項目: "期間工單總數", 數值: data.kpi.totalTickets, 備註: "件" },
      { 項目: "已完成/結案數", 數值: data.kpi.completedOrClosedCount, 備註: "件" },
      { 項目: "待處理工單數", 數值: data.kpi.pendingCount, 備註: "件" },
      { 項目: "處理中工單數", 數值: data.kpi.inProgressCount, 備註: "件" },
      { 項目: "結案率", 數值: `${data.kpi.completionRate}%`, 備註: "已完成工單佔總數比例" },
      { 項目: "平均修復天數", 數值: `${data.kpi.overallAvgDaysToResolve} 天`, 備註: "從通報至完工平均耗時" },
      {
        項目: "平均服務滿意度",
        數值: data.satisfaction.avgRating > 0 ? `${data.satisfaction.avgRating} / 5.0 星` : "無評分",
        備註: `共 ${data.satisfaction.totalRated} 筆有效評分`,
      },
      { 項目: "評分回應率", 數值: `${data.satisfaction.responseRate}%`, 備註: "結案案件提供評分之比例" },
      { 項目: "報表匯出時間", 數值: new Date().toLocaleString("zh-TW"), 備註: "系統自動產出" },
    ];
    addReportWorksheet(workbook, "總覽摘要", kpiRows, [
      { header: "項目", key: "項目", width: 18 },
      { header: "數值", key: "數值", width: 24 },
      { header: "備註", key: "備註", width: 26 },
    ]);

    // 2. Sheet 2: 每月工單趨勢 (Monthly Volume)
    const monthlyRows = data.monthlyTrends.map((item) => ({
      月份: item.month,
      工單總數: item.total,
      已完成件數: item.completed,
      待處理或進行中: item.pendingOrProgress,
      完工率: item.total > 0 ? `${Math.round((item.completed / item.total) * 1000) / 10}%` : "0%",
    }));
    addReportWorksheet(workbook, "每月工單趨勢", monthlyRows, [
      { header: "月份", key: "月份", width: 14 },
      { header: "工單總數", key: "工單總數", width: 12 },
      { header: "已完成件數", key: "已完成件數", width: 14 },
      { header: "待處理或進行中", key: "待處理或進行中", width: 16 },
      { header: "完工率", key: "完工率", width: 12 },
    ]);

    // 3. Sheet 3: 建築物分佈 (Building Distribution)
    const buildingRows = data.buildingDistribution.map((item) => ({
      地點名稱: item.buildingName,
      地點代碼: item.buildingCode,
      工單數量: item.count,
      佔比: `${item.percentage}%`,
    }));
    addReportWorksheet(workbook, "建築物分佈", buildingRows, [
      { header: "地點名稱", key: "地點名稱", width: 20 },
      { header: "地點代碼", key: "地點代碼", width: 14 },
      { header: "工單數量", key: "工單數量", width: 12 },
      { header: "佔比", key: "佔比", width: 12 },
    ]);

    // 4. Sheet 4: 維修分類佔比 (Category Distribution)
    const categoryRows = data.categoryDistribution.map((item) => ({
      分類名稱: item.categoryName,
      工單數量: item.count,
      佔比: `${item.percentage}%`,
    }));
    addReportWorksheet(workbook, "維修分類佔比", categoryRows, [
      { header: "分類名稱", key: "分類名稱", width: 20 },
      { header: "工單數量", key: "工單數量", width: 12 },
      { header: "佔比", key: "佔比", width: 12 },
    ]);

    // 5. Sheet 5: 平均修復時效 (Resolution Times)
    const resolutionRows = data.resolutionTrends.map((item) => ({
      月份: item.month,
      已結案件數: item.completedCount,
      平均修復天數: item.avgDays,
      平均修復時數: item.avgHours,
    }));
    addReportWorksheet(workbook, "平均修復時效", resolutionRows, [
      { header: "月份", key: "月份", width: 14 },
      { header: "已結案件數", key: "已結案件數", width: 14 },
      { header: "平均修復天數", key: "平均修復天數", width: 14 },
      { header: "平均修復時數", key: "平均修復時數", width: 14 },
    ]);

    // 6. Sheet 6: 技師維修績效 (Technician Metrics)
    const technicianRows = data.technicianPerformance.map((item) => ({
      技師姓名: item.displayName,
      已完工件數: item.completedCount,
      處理中件數: item.inProgressCount,
      平均修復天數: `${item.avgDaysToResolve} 天`,
    }));
    addReportWorksheet(workbook, "技師績效", technicianRows, [
      { header: "技師姓名", key: "技師姓名", width: 16 },
      { header: "已完工件數", key: "已完工件數", width: 14 },
      { header: "處理中件數", key: "處理中件數", width: 14 },
      { header: "平均修復天數", key: "平均修復天數", width: 16 },
    ]);

    // 7. Sheet 7: 滿意度分析 (Satisfaction Metrics)
    const satisfactionRows = data.satisfaction.technicianRankings.map((item, idx) => ({
      排名: idx + 1,
      技師姓名: item.displayName,
      平均滿意度: item.avgRating > 0 ? `${item.avgRating} 星` : "無評分",
      已評分件數: item.ratedCount,
      已完工件數: item.completedCount,
    }));
    addReportWorksheet(workbook, "滿意度分析", satisfactionRows, [
      { header: "排名", key: "排名", width: 8 },
      { header: "技師姓名", key: "技師姓名", width: 16 },
      { header: "平均滿意度", key: "平均滿意度", width: 14 },
      { header: "已評分件數", key: "已評分件數", width: 14 },
      { header: "已完工件數", key: "已完工件數", width: 14 },
    ]);

    // Filename: repairhub-report-{preset}-{YYYYMMDD}.xlsx
    const preset = data.filter.preset;
    const filename = `repairhub-report-${preset}-${getTodayString()}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    toast.success("Excel 報表匯出成功！", { id: toastId });
  } catch (error) {
    console.error("Failed to export Excel report:", error);
    toast.error("匯出 Excel 報表失敗，請稍後再試", { id: toastId });
  }
}
