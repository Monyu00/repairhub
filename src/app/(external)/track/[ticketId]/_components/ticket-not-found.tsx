"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { SearchIcon, WrenchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TicketNotFoundProps {
  ticketId: string;
}

export function TicketNotFound({ ticketId }: TicketNotFoundProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/track/${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4 sm:py-12">
      <div className="mx-auto max-w-xl">
        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <WrenchIcon className="size-5" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">RepairHub</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 shadow-sm text-center space-y-6">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
            <SearchIcon className="size-8 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">找不到此報修單</h1>
            <p className="text-sm text-muted-foreground">
              工單編號 <span className="font-mono font-medium text-foreground">{ticketId}</span>{" "}
              不存在，請確認編號是否正確。
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              id="ticket-search-notfound"
              placeholder="輸入工單編號查詢..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!query.trim()}>
              查詢
            </Button>
          </form>

          <Button variant="outline" asChild className="w-full">
            <a href="/report">返回報修表單</a>
          </Button>
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} RepairHub. All rights reserved.
        </div>
      </div>
    </div>
  );
}
