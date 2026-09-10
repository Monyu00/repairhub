"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TicketPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export function TicketPagination({ currentPage, totalPages, totalCount, pageSize }: TicketPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalCount === 0) {
    return null;
  }

  const safeTotalPages = Math.max(1, totalPages);
  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (pageNumber > 1) {
      params.set("page", pageNumber.toString());
    } else {
      params.delete("page");
    }
    return `${pathname}?${params.toString()}`;
  };

  const handlePageSizeChange = (newSize: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSize !== "15") {
      params.set("pageSize", newSize);
    } else {
      params.delete("pageSize");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  // Generate visible page numbers (max 5 buttons)
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (safeTotalPages <= maxVisible) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("ellipsis");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(safeTotalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < safeTotalPages - 2) {
        pages.push("ellipsis");
      }
      pages.push(safeTotalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col items-center justify-between gap-4 py-3 sm:flex-row">
      <div className="flex flex-wrap items-center justify-center gap-3 text-muted-foreground text-xs sm:justify-start">
        <span>
          顯示第 <strong className="font-medium text-foreground">{startRecord}</strong> 至{" "}
          <strong className="font-medium text-foreground">{endRecord}</strong> 筆，共{" "}
          <strong className="font-medium text-foreground">{totalCount}</strong> 筆
          <span className="ml-1 text-muted-foreground/80">
            （第 {currentPage} / {safeTotalPages} 頁）
          </span>
        </span>

        <div className="flex items-center gap-1.5">
          <span>每頁</span>
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-8 w-[72px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span>筆</span>
        </div>
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
          asChild={currentPage < safeTotalPages}
          variant="outline"
          size="sm"
          disabled={currentPage >= safeTotalPages}
          className="h-8 px-2.5"
        >
          {currentPage < safeTotalPages ? (
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
