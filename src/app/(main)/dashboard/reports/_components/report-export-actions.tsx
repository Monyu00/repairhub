"use client";

import { useState } from "react";

import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { ReportData } from "./report-types";

interface ReportExportActionsProps {
  data: ReportData;
}

export function ReportExportActions({ data }: ReportExportActionsProps) {
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { exportReportToExcel } = await import("./report-excel-export");
      await exportReportToExcel(data);
    } catch {
      toast.error("匯出 Excel 報表失敗，請稍後再試");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { exportReportToPDF } = await import("./report-pdf-export");
      await exportReportToPDF(data);
    } catch {
      toast.error("產生 PDF 報表失敗，請稍後再試");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting} className="gap-1.5 shadow-xs">
          {isExporting ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <Download data-icon="inline-start" />
          )}
          <span>匯出報表</span>
          <ChevronDown className="opacity-60" data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>匯出格式選項</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleExportExcel} disabled={isExporting} className="cursor-pointer gap-2">
            <FileSpreadsheet className="text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium text-xs">Excel 活頁簿 (.xlsx)</span>
              <span className="text-muted-foreground text-xs">多工作表結構化數據</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting} className="cursor-pointer gap-2">
            <FileText className="text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium text-xs">PDF 統計報表 (.pdf)</span>
              <span className="text-muted-foreground text-xs">A4 雙頁排版與摘要</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
