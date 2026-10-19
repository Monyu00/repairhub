import Link from "next/link";

import { ClipboardList, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type HomepageView = "all" | "my-tickets";

interface HomepageViewLinksProps {
  activeTab: HomepageView;
  isLoggedIn: boolean;
  myTicketsCount?: number;
}

export function HomepageViewLinks({ activeTab, isLoggedIn, myTicketsCount }: HomepageViewLinksProps) {
  if (!isLoggedIn) {
    return null;
  }

  return (
    <nav
      aria-label="報修單檢視"
      className="inline-flex h-12 w-full items-center rounded-lg bg-muted/70 p-0.5 sm:h-10 sm:w-fit sm:p-1"
    >
      <Button
        asChild
        variant={activeTab === "all" ? "outline" : "ghost"}
        size="sm"
        className="h-11 flex-1 gap-2 px-3 font-medium text-xs sm:h-8 sm:flex-none sm:px-4"
      >
        <Link href="/" aria-current={activeTab === "all" ? "page" : undefined}>
          <ClipboardList data-icon="inline-start" />
          <span>所有報修單</span>
        </Link>
      </Button>
      <Button
        asChild
        variant={activeTab === "my-tickets" ? "outline" : "ghost"}
        size="sm"
        className="h-11 flex-1 gap-2 px-3 font-medium text-xs sm:h-8 sm:flex-none sm:px-4"
      >
        <Link href="/?tab=my-tickets" aria-current={activeTab === "my-tickets" ? "page" : undefined}>
          <UserCheck data-icon="inline-start" />
          <span>我的報修紀錄</span>
          {typeof myTicketsCount === "number" && <Badge variant="secondary">{myTicketsCount}</Badge>}
        </Link>
      </Button>
    </nav>
  );
}
