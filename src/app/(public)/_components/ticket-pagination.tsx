"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface TicketPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export function TicketPagination({ currentPage, totalPages, totalCount, pageSize }: TicketPaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between py-2 text-muted-foreground text-xs">
        <span>共 {totalCount} 筆資料</span>
      </div>
    );
  }

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (pageNumber > 1) {
      params.set("page", pageNumber.toString());
    } else {
      params.delete("page");
    }
    return `${pathname}?${params.toString()}`;
  };

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  // Generate visible page numbers (max 5 buttons)
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("ellipsis");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col items-center justify-between gap-3 py-3 sm:flex-row">
      <div className="text-muted-foreground text-xs">
        顯示第 {startRecord} 至 {endRecord} 筆，共 {totalCount} 筆
      </div>

      <div className="flex items-center gap-1">
        {/* Previous button */}
        <Button
          asChild={currentPage > 1}
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          className="h-8 px-2.5"
        >
          {currentPage > 1 ? (
            <Link href={createPageUrl(currentPage - 1)} aria-label="上一頁">
              <ChevronLeft className="size-4" />
              <span className="ml-1 hidden sm:inline">上一頁</span>
            </Link>
          ) : (
            <span className="flex items-center">
              <ChevronLeft className="size-4" />
              <span className="ml-1 hidden sm:inline">上一頁</span>
            </span>
          )}
        </Button>

        {/* Page buttons */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === "ellipsis") {
              const ellipsisKey = idx < 3 ? "ellipsis-start" : "ellipsis-end";
              return (
                <span key={ellipsisKey} className="px-1.5 text-muted-foreground text-xs">
                  ...
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <Button
                key={`page-${p}`}
                asChild={!isCurrent}
                variant={isCurrent ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0 text-xs"
              >
                {isCurrent ? <span>{p}</span> : <Link href={createPageUrl(p)}>{p}</Link>}
              </Button>
            );
          })}
        </div>

        {/* Next button */}
        <Button
          asChild={currentPage < totalPages}
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          className="h-8 px-2.5"
        >
          {currentPage < totalPages ? (
            <Link href={createPageUrl(currentPage + 1)} aria-label="下一頁">
              <span className="mr-1 hidden sm:inline">下一頁</span>
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className="flex items-center">
              <span className="mr-1 hidden sm:inline">下一頁</span>
              <ChevronRight className="size-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
