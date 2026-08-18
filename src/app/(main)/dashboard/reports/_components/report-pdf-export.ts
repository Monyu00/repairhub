import { jsPDF } from "jspdf";
import { toast } from "sonner";

import type { ReportData } from "./report-types";

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

const CANVAS_WIDTH = 1654; // A4 at ~140 DPI for high crispness
const CANVAS_HEIGHT = 2338;
const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'PingFang TC', 'Microsoft JhengHei', 'Segoe UI', Roboto, sans-serif";

/**
 * Draws Page 1: Header, KPI Summary Cards, Monthly Trends, and Resolution Times
 */
function renderPage1ToCanvas(data: ReportData): string {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context is not supported");

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 1. Top Decorative Bar
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(0, 0, CANVAS_WIDTH, 16);

  // 2. Header
  const marginX = 80;
  let currentY = 80;

  ctx.fillStyle = "#0f172a";
  ctx.font = `bold 38px ${FONT_FAMILY}`;
  ctx.textAlign = "left";
  ctx.fillText("RepairHub 報修管理系統 — 統計分析報表", marginX, currentY);

  ctx.font = `20px ${FONT_FAMILY}`;
  ctx.fillStyle = "#64748b";
  ctx.fillText(`統計區間：${data.kpi.activePeriodLabel}`, marginX, currentY + 36);

  ctx.textAlign = "right";
  ctx.fillText(`匯出日期：${new Date().toLocaleDateString("zh-TW")}`, CANVAS_WIDTH - marginX, currentY + 36);
  ctx.textAlign = "left";

  // Header Divider
  currentY += 60;
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(marginX, currentY);
  ctx.lineTo(CANVAS_WIDTH - marginX, currentY);
  ctx.stroke();

  // 3. KPI Overview Cards
  currentY += 40;
  const cardGap = 24;
  const totalCardsWidth = CANVAS_WIDTH - marginX * 2;
  const cardWidth = (totalCardsWidth - cardGap * 3) / 4;
  const cardHeight = 150;

  const kpiItems = [
    {
      title: "期間工單總數",
      value: `${data.kpi.totalTickets}`,
      unit: "件",
      sub: data.kpi.activePeriodLabel,
      bg: "#eff6ff",
      accent: "#3b82f6",
    },
    {
      title: "完工/結案率",
      value: `${data.kpi.completionRate}%`,
      unit: "",
      sub: `共 ${data.kpi.completedOrClosedCount} 件結案`,
      bg: "#f0fdf4",
      accent: "#22c55e",
    },
    {
      title: "平均修復時間",
      value: `${data.kpi.overallAvgDaysToResolve}`,
      unit: "天",
      sub: "通報至完工平均耗時",
      bg: "#fffbeb",
      accent: "#f59e0b",
    },
    {
      title: "待處理與進行中",
      value: `${data.kpi.pendingCount + data.kpi.inProgressCount}`,
      unit: "件",
      sub: `待辦 ${data.kpi.pendingCount} | 進行中 ${data.kpi.inProgressCount}`,
      bg: "#f8fafc",
      accent: "#64748b",
    },
  ];

  kpiItems.forEach((kpi, idx) => {
    const cardX = marginX + idx * (cardWidth + cardGap);
    // Card Box
    ctx.fillStyle = kpi.bg;
    ctx.beginPath();
    ctx.roundRect(cardX, currentY, cardWidth, cardHeight, 16);
    ctx.fill();

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Accent line
    ctx.fillStyle = kpi.accent;
    ctx.beginPath();
    ctx.roundRect(cardX + 16, currentY + 16, 4, cardHeight - 32, 2);
    ctx.fill();

    // Card texts
    ctx.fillStyle = "#64748b";
    ctx.font = `bold 18px ${FONT_FAMILY}`;
    ctx.fillText(kpi.title, cardX + 32, currentY + 42);

    ctx.fillStyle = "#0f172a";
    ctx.font = `bold 36px ${FONT_FAMILY}`;
    ctx.fillText(kpi.value, cardX + 32, currentY + 92);
    if (kpi.unit) {
      const valWidth = ctx.measureText(kpi.value).width;
      ctx.font = `18px ${FONT_FAMILY}`;
      ctx.fillStyle = "#64748b";
      ctx.fillText(kpi.unit, cardX + 36 + valWidth, currentY + 92);
    }

    ctx.font = `14px ${FONT_FAMILY}`;
    ctx.fillStyle = "#64748b";
    ctx.fillText(kpi.sub, cardX + 32, currentY + 126);
  });

  currentY += cardHeight + 50;

  // 4. Section: 每月工單趨勢表
  ctx.fillStyle = "#0f172a";
  ctx.font = `bold 24px ${FONT_FAMILY}`;
  ctx.fillText("一、 每月工單數量與趨勢統計", marginX, currentY);

  currentY += 24;
  const tableWidth = CANVAS_WIDTH - marginX * 2;
  const rowHeight = 44;

  // Monthly Table Headers
  const monthlyCols = [
    { title: "月份", width: 220, align: "left" as const },
    { title: "工單總數", width: 260, align: "right" as const },
    { title: "已完成件數", width: 260, align: "right" as const },
    { title: "待處理/進行中", width: 280, align: "right" as const },
    { title: "完工比率", width: 260, align: "right" as const },
  ];

  ctx.fillStyle = "#f1f5f9";
  ctx.beginPath();
  ctx.roundRect(marginX, currentY, tableWidth, rowHeight, 8);
  ctx.fill();

  ctx.fillStyle = "#334155";
  ctx.font = `bold 16px ${FONT_FAMILY}`;

  let colX = marginX + 24;
  monthlyCols.forEach((col) => {
    if (col.align === "left") {
      ctx.textAlign = "left";
      ctx.fillText(col.title, colX, currentY + 28);
    } else {
      ctx.textAlign = "right";
      ctx.fillText(col.title, colX + col.width - 24, currentY + 28);
    }
    colX += col.width;
  });

  currentY += rowHeight;

  // Monthly Data Rows
  if (data.monthlyTrends.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = `16px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText("期間內無工單趨勢資料", CANVAS_WIDTH / 2, currentY + 36);
    currentY += 60;
  } else {
    data.monthlyTrends.forEach((m, rIdx) => {
      ctx.fillStyle = rIdx % 2 === 0 ? "#ffffff" : "#f8fafc";
      ctx.fillRect(marginX, currentY, tableWidth, rowHeight);

      // Bottom border
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginX, currentY + rowHeight);
      ctx.lineTo(marginX + tableWidth, currentY + rowHeight);
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.font = `16px ${FONT_FAMILY}`;

      const rate = m.total > 0 ? `${Math.round((m.completed / m.total) * 1000) / 10}%` : "0%";
      const rowValues = [m.month, `${m.total} 件`, `${m.completed} 件`, `${m.pendingOrProgress} 件`, rate];

      let rowColX = marginX + 24;
      monthlyCols.forEach((col, cIdx) => {
        if (col.align === "left") {
          ctx.textAlign = "left";
          ctx.fillText(rowValues[cIdx], rowColX, currentY + 28);
        } else {
          ctx.textAlign = "right";
          ctx.fillText(rowValues[cIdx], rowColX + col.width - 24, currentY + 28);
        }
        rowColX += col.width;
      });

      currentY += rowHeight;
    });
  }

  currentY += 50;

  // 5. Section: 平均修復時效統計
  ctx.fillStyle = "#0f172a";
  ctx.font = `bold 24px ${FONT_FAMILY}`;
  ctx.textAlign = "left";
  ctx.fillText("二、 平均修復時效分析 (月度指標)", marginX, currentY);

  currentY += 24;
  const resCols = [
    { title: "月份", width: 260, align: "left" as const },
    { title: "已結案件數", width: 320, align: "right" as const },
    { title: "平均修復天數", width: 340, align: "right" as const },
    { title: "平均修復時數", width: 360, align: "right" as const },
  ];

  ctx.fillStyle = "#f1f5f9";
  ctx.beginPath();
  ctx.roundRect(marginX, currentY, tableWidth, rowHeight, 8);
  ctx.fill();

  ctx.fillStyle = "#334155";
  ctx.font = `bold 16px ${FONT_FAMILY}`;

  let resColX = marginX + 24;
  resCols.forEach((col) => {
    if (col.align === "left") {
      ctx.textAlign = "left";
      ctx.fillText(col.title, resColX, currentY + 28);
    } else {
      ctx.textAlign = "right";
      ctx.fillText(col.title, resColX + col.width - 24, currentY + 28);
    }
    resColX += col.width;
  });

  currentY += rowHeight;

  if (data.resolutionTrends.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = `16px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText("期間內無修復時效數據", CANVAS_WIDTH / 2, currentY + 36);
  } else {
    data.resolutionTrends.forEach((res, rIdx) => {
      ctx.fillStyle = rIdx % 2 === 0 ? "#ffffff" : "#f8fafc";
      ctx.fillRect(marginX, currentY, tableWidth, rowHeight);

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginX, currentY + rowHeight);
      ctx.lineTo(marginX + tableWidth, currentY + rowHeight);
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.font = `16px ${FONT_FAMILY}`;

      const rowValues = [res.month, `${res.completedCount} 件`, `${res.avgDays} 天`, `${res.avgHours} 小時`];

      let rColX = marginX + 24;
      resCols.forEach((col, cIdx) => {
        if (col.align === "left") {
          ctx.textAlign = "left";
          ctx.fillText(rowValues[cIdx], rColX, currentY + 28);
        } else {
          ctx.textAlign = "right";
          ctx.fillText(rowValues[cIdx], rColX + col.width - 24, currentY + 28);
        }
        rColX += col.width;
      });

      currentY += rowHeight;
    });
  }

  // Footer for Page 1
  ctx.fillStyle = "#94a3b8";
  ctx.font = `14px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.fillText("RepairHub 智慧校園修繕平台 — 第 1 頁，共 2 頁", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);

  return canvas.toDataURL("image/png");
}

/**
 * Draws Page 2: Building Distribution, Category Distribution, and Technician Performance
 */
function renderPage2ToCanvas(data: ReportData): string {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context is not supported");

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Top Bar
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(0, 0, CANVAS_WIDTH, 16);

  const marginX = 80;
  let currentY = 80;

  ctx.fillStyle = "#0f172a";
  ctx.font = `bold 34px ${FONT_FAMILY}`;
  ctx.textAlign = "left";
  ctx.fillText("RepairHub 報修管理系統 — 詳細分佈與績效分析", marginX, currentY);

  ctx.font = `20px ${FONT_FAMILY}`;
  ctx.fillStyle = "#64748b";
  ctx.fillText("空間分佈、分類佔比與維修技師執行指標", marginX, currentY + 36);

  currentY += 60;
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(marginX, currentY);
  ctx.lineTo(CANVAS_WIDTH - marginX, currentY);
  ctx.stroke();

  currentY += 40;

  // Grid Layout: 2 Columns for Building & Category
  const colGap = 40;
  const sectionColWidth = (CANVAS_WIDTH - marginX * 2 - colGap) / 2;
  const rowHeight = 40;

  // Left Column: Building Distribution
  ctx.fillStyle = "#0f172a";
  ctx.font = `bold 22px ${FONT_FAMILY}`;
  ctx.fillText("三、 建築物通報分佈", marginX, currentY);

  let bldgY = currentY + 20;
  ctx.fillStyle = "#f1f5f9";
  ctx.beginPath();
  ctx.roundRect(marginX, bldgY, sectionColWidth, rowHeight, 6);
  ctx.fill();

  ctx.fillStyle = "#334155";
  ctx.font = `bold 15px ${FONT_FAMILY}`;
  ctx.textAlign = "left";
  ctx.fillText("建築物名稱", marginX + 16, bldgY + 26);
  ctx.textAlign = "right";
  ctx.fillText("件數 (佔比)", marginX + sectionColWidth - 16, bldgY + 26);

  bldgY += rowHeight;

  if (data.buildingDistribution.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = `15px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText("無建築物分佈資料", marginX + sectionColWidth / 2, bldgY + 30);
    bldgY += 50;
  } else {
    data.buildingDistribution.slice(0, 8).forEach((b, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
      ctx.fillRect(marginX, bldgY, sectionColWidth, rowHeight);

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginX, bldgY + rowHeight);
      ctx.lineTo(marginX + sectionColWidth, bldgY + rowHeight);
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.font = `15px ${FONT_FAMILY}`;
      ctx.textAlign = "left";
      ctx.fillText(`${b.buildingName} (${b.buildingCode})`, marginX + 16, bldgY + 26);

      ctx.textAlign = "right";
      ctx.fillText(`${b.count} 件 (${b.percentage}%)`, marginX + sectionColWidth - 16, bldgY + 26);

      bldgY += rowHeight;
    });
  }

  // Right Column: Category Distribution
  const catX = marginX + sectionColWidth + colGap;
  ctx.fillStyle = "#0f172a";
  ctx.font = `bold 22px ${FONT_FAMILY}`;
  ctx.textAlign = "left";
  ctx.fillText("四、 維修分類佔比", catX, currentY);

  let catY = currentY + 20;
  ctx.fillStyle = "#f1f5f9";
  ctx.beginPath();
  ctx.roundRect(catX, catY, sectionColWidth, rowHeight, 6);
  ctx.fill();

  ctx.fillStyle = "#334155";
  ctx.font = `bold 15px ${FONT_FAMILY}`;
  ctx.textAlign = "left";
  ctx.fillText("分類名稱", catX + 16, catY + 26);
  ctx.textAlign = "right";
  ctx.fillText("件數 (佔比)", catX + sectionColWidth - 16, catY + 26);

  catY += rowHeight;

  if (data.categoryDistribution.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = `15px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText("無分類分佈資料", catX + sectionColWidth / 2, catY + 30);
    catY += 50;
  } else {
    data.categoryDistribution.slice(0, 8).forEach((c, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
      ctx.fillRect(catX, catY, sectionColWidth, rowHeight);

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(catX, catY + rowHeight);
      ctx.lineTo(catX + sectionColWidth, catY + rowHeight);
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.font = `15px ${FONT_FAMILY}`;
      ctx.textAlign = "left";
      ctx.fillText(c.categoryName, catX + 16, catY + 26);

      ctx.textAlign = "right";
      ctx.fillText(`${c.count} 件 (${c.percentage}%)`, catX + sectionColWidth - 16, catY + 26);

      catY += rowHeight;
    });
  }

  // Next section after the taller column
  currentY = Math.max(bldgY, catY) + 50;

  // Section 5: Technician Performance
  ctx.fillStyle = "#0f172a";
  ctx.font = `bold 24px ${FONT_FAMILY}`;
  ctx.textAlign = "left";
  ctx.fillText("五、 技師維修績效與工作量統計", marginX, currentY);

  currentY += 24;
  const tableWidth = CANVAS_WIDTH - marginX * 2;
  const techRowHeight = 44;

  const techCols = [
    { title: "技師姓名", width: 320, align: "left" as const },
    { title: "已完工件數", width: 280, align: "right" as const },
    { title: "進行中件數", width: 280, align: "right" as const },
    { title: "平均修復天數", width: 400, align: "right" as const },
  ];

  ctx.fillStyle = "#f1f5f9";
  ctx.beginPath();
  ctx.roundRect(marginX, currentY, tableWidth, techRowHeight, 8);
  ctx.fill();

  ctx.fillStyle = "#334155";
  ctx.font = `bold 16px ${FONT_FAMILY}`;

  let tColX = marginX + 24;
  techCols.forEach((col) => {
    if (col.align === "left") {
      ctx.textAlign = "left";
      ctx.fillText(col.title, tColX, currentY + 28);
    } else {
      ctx.textAlign = "right";
      ctx.fillText(col.title, tColX + col.width - 24, currentY + 28);
    }
    tColX += col.width;
  });

  currentY += techRowHeight;

  if (data.technicianPerformance.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = `16px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText("無技師績效數據", CANVAS_WIDTH / 2, currentY + 36);
  } else {
    data.technicianPerformance.forEach((tech, rIdx) => {
      ctx.fillStyle = rIdx % 2 === 0 ? "#ffffff" : "#f8fafc";
      ctx.fillRect(marginX, currentY, tableWidth, techRowHeight);

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginX, currentY + techRowHeight);
      ctx.lineTo(marginX + tableWidth, currentY + techRowHeight);
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.font = `16px ${FONT_FAMILY}`;

      const rowValues = [
        tech.displayName,
        `${tech.completedCount} 件`,
        `${tech.inProgressCount} 件`,
        `${tech.avgDaysToResolve} 天`,
      ];

      let rColX = marginX + 24;
      techCols.forEach((col, cIdx) => {
        if (col.align === "left") {
          ctx.textAlign = "left";
          ctx.fillText(rowValues[cIdx], rColX, currentY + 28);
        } else {
          ctx.textAlign = "right";
          ctx.fillText(rowValues[cIdx], rColX + col.width - 24, currentY + 28);
        }
        rColX += col.width;
      });

      currentY += techRowHeight;
    });
  }

  // Footer for Page 2
  ctx.fillStyle = "#94a3b8";
  ctx.font = `14px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.fillText("RepairHub 智慧校園修繕平台 — 第 2 頁，共 2 頁", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);

  return canvas.toDataURL("image/png");
}

/**
 * Generates an A4 PDF containing all report charts, KPIs, and summaries in 2 structured pages.
 */
export async function exportReportToPDF(data: ReportData): Promise<void> {
  const toastId = toast.loading("正在產生 PDF 統計報表...");

  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Page 1: Header, KPIs, Monthly Trends, Resolution Times
    const page1Img = renderPage1ToCanvas(data);
    doc.addImage(page1Img, "PNG", 0, 0, 210, 297, undefined, "FAST");

    // Page 2: Distribution & Technician Metrics
    doc.addPage();
    const page2Img = renderPage2ToCanvas(data);
    doc.addImage(page2Img, "PNG", 0, 0, 210, 297, undefined, "FAST");

    const preset = data.filter.preset;
    const filename = `repairhub-report-${preset}-${getTodayString()}.pdf`;

    doc.save(filename);

    toast.success("PDF 統計報表匯出成功！", { id: toastId });
  } catch (error) {
    console.error("Failed to generate PDF report:", error);
    toast.error("產生 PDF 報表失敗，請稍後再試", { id: toastId });
  }
}
