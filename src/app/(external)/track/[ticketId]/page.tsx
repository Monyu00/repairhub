import Link from "next/link";

import { ArrowLeftIcon, CheckCircle2Icon, ClockIcon, WrenchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

interface TrackPageProps {
  params: Promise<{
    ticketId: string;
  }>;
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { ticketId } = await params;
  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "id, status, description, created_at, category:categories(name), space:spaces(name, building:buildings(name))",
    )
    .eq("id", ticketId)
    .single();

  const spaceObj = Array.isArray(ticket?.space) ? ticket?.space[0] : ticket?.space;
  const buildingObj = Array.isArray(spaceObj?.building) ? spaceObj?.building[0] : spaceObj?.building;
  const categoryObj = Array.isArray(ticket?.category) ? ticket?.category[0] : ticket?.category;

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

        <Card className="border border-border bg-card p-6 shadow-sm sm:p-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <CheckCircle2Icon className="size-8" />
          </div>

          <h1 className="text-2xl font-bold text-foreground">報修單已成功送出</h1>
          <p className="mt-1 text-sm text-muted-foreground">我們已收到您的通報，將儘速安排專人處理。</p>

          <div className="my-6 rounded-lg bg-muted/50 p-4 border border-border text-left space-y-2 text-sm">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-muted-foreground">報修單號</span>
              <span className="font-mono font-medium text-foreground">{ticketId}</span>
            </div>

            {ticket && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">類別</span>
                  <span className="font-medium text-foreground">{categoryObj?.name || "-"}</span>
                </div>
                {buildingObj && spaceObj && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">地點</span>
                    <span className="font-medium text-foreground">
                      {buildingObj.name} - {spaceObj.name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">狀態</span>
                  <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                    <ClockIcon className="size-3.5" />
                    等待處理中 (Pending)
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/report">
                <ArrowLeftIcon className="mr-2 size-4" />
                返回報修表單
              </Link>
            </Button>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} RepairHub. All rights reserved.
        </div>
      </div>
    </div>
  );
}
