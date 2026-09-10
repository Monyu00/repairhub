"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ClipboardList, UserCheck } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HomepageTabsProps {
  activeTab: string;
  isLoggedIn: boolean;
  myTicketsCount?: number;
}

export function HomepageTabs({ activeTab, isLoggedIn, myTicketsCount }: HomepageTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const _searchParams = useSearchParams();

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams();
    if (value !== "all") {
      params.set("tab", value);
    }
    // Switching tabs resets page and filters for clean context
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="h-10 bg-muted/70 p-1">
        <TabsTrigger value="all" className="cursor-pointer gap-2 px-4 font-medium text-xs">
          <ClipboardList className="size-4" />
          <span>所有報修單</span>
        </TabsTrigger>
        {isLoggedIn && (
          <TabsTrigger value="my-tickets" className="cursor-pointer gap-2 px-4 font-medium text-xs">
            <UserCheck className="size-4" />
            <span>我的報修紀錄</span>
            {typeof myTicketsCount === "number" && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 font-semibold text-[10px] text-primary">
                {myTicketsCount}
              </span>
            )}
          </TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  );
}
