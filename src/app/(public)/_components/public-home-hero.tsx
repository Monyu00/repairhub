import Link from "next/link";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PublicHomeHero() {
  return (
    <section className="border-border border-b bg-muted/20">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-extrabold font-heading text-2xl text-foreground sm:text-3xl">
              從報修到完工，全程看得見
            </h1>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
              免登入即可通報校園設施與設備問題；每筆公開報修單都能即時查詢最新處理進度。
            </p>
          </div>

          <Button asChild size="lg" className="h-11 w-full sm:h-9 sm:w-auto">
            <Link href="/report">
              <Plus data-icon="inline-start" />
              <span>我要報修</span>
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
