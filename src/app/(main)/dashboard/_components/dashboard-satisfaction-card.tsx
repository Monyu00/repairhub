import Link from "next/link";

import { ArrowRight, Star, TrendingUp, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fetchGlobalRatingSummary, fetchTechnicianPersonalRating } from "@/server/tickets/rating-stats";

interface DashboardSatisfactionCardProps {
  role: "admin" | "technician" | null;
  userId?: string | null;
}

export async function DashboardSatisfactionCard({ role, userId }: DashboardSatisfactionCardProps) {
  if (role !== "admin" && role !== "technician") {
    return null;
  }

  if (role === "admin") {
    const { avgRating, responseRate, ratedCount, closedCount } = await fetchGlobalRatingSummary();

    return (
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
                <Star className="size-4 fill-amber-400" />
              </div>
              <CardTitle className="font-semibold text-base">維修完工滿意度總覽</CardTitle>
            </div>
            <CardDescription className="text-xs">全校通報案件之結案評分與服務回饋指標</CardDescription>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link href="/dashboard/reports">
              詳細報表
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-1">
            <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <Star className="size-5 fill-amber-400" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold text-2xl text-foreground tabular-nums">
                    {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 5.0</span>
                </div>
                <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={cn(
                        "size-3",
                        s <= Math.round(avgRating)
                          ? "fill-amber-400 text-amber-500"
                          : "fill-transparent text-muted-foreground/30",
                      )}
                    />
                  ))}
                  <span className="ml-1">平均評分</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <TrendingUp className="size-5" />
              </div>
              <div>
                <div className="font-bold text-2xl text-foreground tabular-nums">{responseRate}%</div>
                <div className="text-[11px] text-muted-foreground">評分回應率（結案 {closedCount} 件）</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="size-5" />
              </div>
              <div>
                <div className="font-bold text-2xl text-foreground tabular-nums">
                  {ratedCount} <span className="font-normal text-xs text-muted-foreground">筆</span>
                </div>
                <div className="text-[11px] text-muted-foreground">通報人主動評分件數</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Technician personal widget
  if (!userId) return null;

  const personalStats = await fetchTechnicianPersonalRating(userId);

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
              <Star className="size-4 fill-amber-400" />
            </div>
            <CardTitle className="font-semibold text-base">我的維修滿意度評分</CardTitle>
          </div>
          <CardDescription className="text-xs">您所承接並結案工單之通報人評價數據</CardDescription>
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link href="/dashboard/repair-records">
            維修紀錄
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-1">
          <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Star className="size-5 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-2xl text-foreground tabular-nums">
                  {personalStats.avgRating > 0 ? personalStats.avgRating.toFixed(1) : "—"}
                </span>
                <span className="text-xs text-muted-foreground">/ 5.0</span>
              </div>
              <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn(
                      "size-3",
                      s <= Math.round(personalStats.avgRating)
                        ? "fill-amber-400 text-amber-500"
                        : "fill-transparent text-muted-foreground/30",
                    )}
                  />
                ))}
                <span className="ml-1">個人平均</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Star className="size-5" />
            </div>
            <div>
              <div className="font-bold text-2xl text-foreground tabular-nums">
                {personalStats.ratedCount} <span className="font-normal text-xs text-muted-foreground">筆</span>
              </div>
              <div className="text-[11px] text-muted-foreground">已獲通報人評分</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <div className="font-bold text-2xl text-foreground tabular-nums">{personalStats.responseRate}%</div>
              <div className="text-[11px] text-muted-foreground">評分回應率（結案 {personalStats.closedCount} 件）</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
