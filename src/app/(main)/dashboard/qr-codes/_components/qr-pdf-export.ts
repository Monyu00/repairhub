import QRCode from "qrcode";
import { toast } from "sonner";

import type { PrintableQRItem } from "./types";

/**
 * Renders a single printable QR card onto an offscreen canvas at high resolution (300 DPI equivalent)
 */
export async function renderCardToCanvas(item: PrintableQRItem): Promise<string> {
  const canvas = document.createElement("canvas");
  const width = 880;
  const height = 850;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // 1. White Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // 2. Card Border (with slight rounded corners and subtle cut lines)
  ctx.strokeStyle = "#4b5563";
  ctx.lineWidth = 3;
  ctx.beginPath();
  const radius = 24;
  ctx.roundRect(16, 16, width - 32, height - 32, radius);
  ctx.stroke();

  // 3. Header Section
  ctx.fillStyle = "#111827";
  ctx.font =
    "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("RepairHub 報修系統", 48, 64);

  // Header Badge (空間 QR / 設備 QR)
  const badgeText = item.type === "space" ? "空間 QR" : "設備 QR";
  ctx.font =
    "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  const badgeWidth = ctx.measureText(badgeText).width + 24;
  ctx.fillStyle = "#f3f4f6";
  ctx.beginPath();
  ctx.roundRect(width - 48 - badgeWidth, 44, badgeWidth, 40, 10);
  ctx.fill();
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#374151";
  ctx.textAlign = "center";
  ctx.fillText(badgeText, width - 48 - badgeWidth / 2, 64);

  // Header Divider
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(32, 104);
  ctx.lineTo(width - 32, 104);
  ctx.stroke();

  // 4. Generate & Draw QR Code Image
  const qrDataUrl = await QRCode.toDataURL(item.url, {
    width: 440,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  const qrImage = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImage.onload = () => resolve();
    qrImage.onerror = (e) => reject(e);
    qrImage.src = qrDataUrl;
  });

  const qrSize = 420;
  const qrX = (width - qrSize) / 2;
  const qrY = 120;
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  // 5. Title & Info Labels
  ctx.textAlign = "center";
  ctx.fillStyle = "#111827";
  ctx.font =
    "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  ctx.fillText(item.title, width / 2, 580);

  ctx.fillStyle = "#4b5563";
  ctx.font =
    "24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  ctx.fillText(item.subtitle, width / 2, 624);

  if (item.code) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "20px 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";
    ctx.fillText(`編號: ${item.code}`, width / 2, 664);
  }

  // 6. Footer Notice Box
  const footerY = 710;
  ctx.fillStyle = "#f9fafb";
  ctx.beginPath();
  ctx.roundRect(48, footerY, width - 96, 76, 12);
  ctx.fill();
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#6b7280";
  ctx.font =
    "20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  ctx.fillText("請使用手機相機掃描 QR Code 快速通報修繕", width / 2, footerY + 38);

  return canvas.toDataURL("image/png");
}

/**
 * Generates an A4 PDF containing all selected QR codes arranged in a 2x3 grid per page.
 */
export async function exportQRCodesToPDF(
  items: PrintableQRItem[],
  filenamePrefix = "RepairHub_QRCodes",
): Promise<void> {
  if (items.length === 0) {
    toast.error("請至少選取一個項目以產生 PDF");
    return;
  }

  const toastId = toast.loading(`正在產生 ${items.length} 張 QR Code PDF...`);

  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Layout configuration (A4 = 210mm x 297mm)
    const cardWidth = 88;
    const cardHeight = 85;
    const marginLeft = 12;
    const marginTop = 12;
    const colGap = 10;
    const rowGap = 9;

    const cardsPerPage = 6;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const pageIndex = i % cardsPerPage;

      if (i > 0 && pageIndex === 0) {
        doc.addPage();
      }

      const col = pageIndex % 2;
      const row = Math.floor(pageIndex / 2);

      const x = marginLeft + col * (cardWidth + colGap);
      const y = marginTop + row * (cardHeight + rowGap);

      // Render crisp card PNG
      const cardImage = await renderCardToCanvas(item);
      doc.addImage(cardImage, "PNG", x, y, cardWidth, cardHeight, undefined, "FAST");
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    doc.save(`${filenamePrefix}_${todayStr}.pdf`);

    toast.success(`PDF 下載成功！共 ${items.length} 張 QR Code`, { id: toastId });
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    toast.error("產生 PDF 失敗，請稍後再試", { id: toastId });
  }
}

/**
 * Downloads a single card as a high-resolution PNG image.
 */
export async function downloadCardImage(item: PrintableQRItem): Promise<void> {
  try {
    const cardDataUrl = await renderCardToCanvas(item);
    const a = document.createElement("a");
    a.href = cardDataUrl;
    const sanitizedTitle = item.title.replace(/[\s/\\:*?"<>|]/g, "_");
    a.download = `QR_${item.type}_${sanitizedTitle}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`已下載 ${item.title} 卡片圖片`);
  } catch (error) {
    console.error("Failed to download card image:", error);
    toast.error("下載卡片圖片失敗");
  }
}
