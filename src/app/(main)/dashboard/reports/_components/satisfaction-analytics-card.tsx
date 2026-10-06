"use client";

import { Award, BarChart2, Star, TrendingUp, Users } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import type { SatisfactionReportData } from "./report-types";

interface SatisfactionAnalyticsCardProps {
  data: SatisfactionReportData;
}

const trendChartConfig = {
  avgRating: {
    label: "平均滿意度",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function SatisfactionAnalyticsCard({ data }: SatisfactionAnalyticsCardProps) {
  const { avgRating, totalRated, totalClosed, responseRate, distribution, monthlyTrends, technicianRankings } = data;
  const hasData = totalRated > 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-start pb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
            <Star className="h-4 w-4 fill-amber-500" />
          </div>
          <div>
            <CardTitle className="font-semibold text-base">完工評分與滿意度分析</CardTitle>
            <CardDescription className="text-xs">
              通報人於結案時主動提供之 1-5 星滿意度統計、評分分佈與技師滿意度表現
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Average Rating */}
          <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>整體平均滿意度</span>
              <Star className="size-4 text-amber-500 fill-amber-400" />
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="font-bold text-3xl text-foreground tracking-tight tabular-nums">
                {avgRating > 0 ? avgRating.toFixed(1) : "—"}
              </span>
              <span className="text-xs text-muted-foreground">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "size-3.5",
                    s <= Math.round(avgRating)
                      ? "fill-amber-400 text-amber-500"
                      : "fill-transparent text-muted-foreground/30",
                  )}
                />
              ))}
              <span className="ml-1.5 text-[11px] text-muted-foreground">（共 {totalRated} 筆評價）</span>
            </div>
          </div>

          {/* Response Rate */}
          <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>評分回應率</span>
              <TrendingUp className="size-4 text-emerald-500" />
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="font-bold text-3xl text-foreground tracking-tight tabular-nums">{responseRate}%</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              已結案 {totalClosed} 件中，{totalRated} 件通報人完成評分
            </p>
          </div>

          {/* Top Technician highlight */}
          <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>最佳滿意度技師</span>
              <Award className="size-4 text-primary" />
            </div>
            <div className="my-2">
              {technicianRankings.length > 0 && technicianRankings[0].ratedCount > 0 ? (
                <>
                  <div className="font-bold text-lg text-foreground truncate">{technicianRankings[0].displayName}</div>
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    <Star className="size-3.5 fill-amber-400 text-amber-500" />
                    <span>{technicianRankings[0].avgRating.toFixed(1)} 分</span>
                    <span className="text-muted-foreground font-normal">
                      （{technicianRankings[0].ratedCount} 筆評分）
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-muted-foreground text-sm">尚無評價數據</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">依技師平均評分與件數綜合排序</p>
          </div>
        </div>

        {!hasData ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border/60 text-muted-foreground text-xs">
            此篩選時段內尚無已評分之結案工單
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Rating Distribution */}
            <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <BarChart2 className="size-3.5 text-primary" />
                  星等評價分佈
                </span>
                <span className="text-[11px] text-muted-foreground">共 {totalRated} 筆有效評分</span>
              </div>

              <div className="space-y-2.5 pt-1">
                {distribution.map((d) => (
                  <div key={d.star} className="flex items-center gap-3 text-xs">
                    <div className="flex w-14 shrink-0 items-center gap-1 font-medium text-foreground">
                      <span>{d.star} 星</span>
                      <Star className="size-3 fill-amber-400 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all duration-300"
                          style={{ width: `${d.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 shrink-0 text-right tabular-nums text-muted-foreground text-[11px]">
                      {d.count} 件 ({d.percentage}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Trend Chart */}
            <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <TrendingUp className="size-3.5 text-primary" />
                  各月份滿意度趨勢
                </span>
                <span className="text-[11px] text-muted-foreground">平均分數走勢</span>
              </div>

              {monthlyTrends.length === 0 ? (
                <div className="flex h-36 items-center justify-center text-muted-foreground text-xs">
                  尚無足夠月份趨勢資料
                </div>
              ) : (
                <ChartContainer config={trendChartConfig} className="h-36 w-full">
                  <LineChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(val) => `${val.slice(5)}月`}
                      className="text-[11px]"
                    />
                    <YAxis
                      domain={[1, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-[11px]"
                    />
                    <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                    <Line
                      type="monotone"
                      dataKey="avgRating"
                      stroke="var(--color-avgRating)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "var(--color-avgRating)" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </div>
          </div>
        )}

        {/* Technician Rankings Table */}
        {technicianRankings.length > 0 && (
          <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                <Users className="size-3.5 text-primary" />
                維修工程人員滿意度排行榜
              </span>
              <span className="text-[11px] text-muted-foreground">依滿意度與評分量綜合排行</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 pt-1">
              {technicianRankings.map((tech, index) => {
                const isTop3 = index < 3;
                return (
                  <div
                    key={tech.technicianId}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3 text-xs transition-colors",
                      isTop3
                        ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
                        : "border-border/50 bg-muted/20 hover:border-border",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full font-bold text-[11px]",
                          index === 0
                            ? "bg-amber-500 text-white"
                            : index === 1
                              ? "bg-zinc-400 text-white"
                              : index === 2
                                ? "bg-amber-700 text-white"
                                : "bg-muted text-muted-foreground",
                        )}
                      >
                        {index + 1}
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground block truncate max-w-[120px]">
                          {tech.displayName}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          總完工: {tech.completedCount} 件 | 已評: {tech.ratedCount} 筆
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {tech.ratedCount > 0 ? (
                        <div className="flex items-center gap-1">
                          <Star className="size-3.5 fill-amber-400 text-amber-500" />
                          <span className="font-bold text-foreground tabular-nums text-sm">
                            {tech.avgRating.toFixed(1)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">尚無評分</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
