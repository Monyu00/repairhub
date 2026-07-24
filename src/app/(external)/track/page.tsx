import Link from "next/link";

import { ArrowLeft, Search } from "lucide-react";

import { TicketSearch } from "./[ticketId]/_components/ticket-search";

export default function TrackSearchPage() {
  return (
    <div className="flex min-h-dvh flex-col justify-center bg-muted/40 p-4 md:p-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Search className="size-6" />
          </div>
          <h1 className="font-bold text-2xl tracking-tight">查詢報修單進度</h1>
          <p className="text-muted-foreground text-sm">請輸入您的報修單號碼 (UUID) 以查看處理進度</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-xs sm:p-8">
          <TicketSearch currentTicketId="" />
        </div>

        <div className="flex justify-between px-2 text-xs text-muted-foreground">
          <Link href="/login" className="inline-flex items-center gap-1 hover:underline">
            <ArrowLeft className="size-3" /> 返回登入頁
          </Link>
          <Link href="/report" className="hover:underline">
            我要報修 →
          </Link>
        </div>
      </div>
    </div>
  );
}
