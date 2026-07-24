"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TicketSearchProps {
  currentTicketId: string;
}

export function TicketSearch({ currentTicketId }: TicketSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/track/${encodeURIComponent(trimmed)}`);
      setQuery("");
    }
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-2" aria-label="查詢其他工單">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          id="ticket-search"
          placeholder={`目前：${currentTicketId.slice(0, 8)}… 查詢其他工單號碼`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <Button type="submit" variant="secondary" disabled={!query.trim()}>
        查詢
      </Button>
    </form>
  );
}
