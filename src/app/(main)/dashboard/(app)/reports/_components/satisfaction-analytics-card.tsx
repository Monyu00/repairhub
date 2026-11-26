"use client";

import { Award, BarChart2, Star, TrendingUp, Users } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
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
          <div className="bg-primary/10 text-primary rounded-lg p-2">
            <Star className="fill-primary h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">完工評分與滿意度分析</CardTitle>
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
          <div className="border-border/60 bg-muted/20 flex flex-col justify-between rounded-xl border p-4">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>整體平均滿意度</span>
              <Star className="fill-primary text-primary size-4" />
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-foreground text-3xl font-bold tracking-tight tabular-nums">
                {avgRating > 0 ? avgRating.toFixed(1) : "—"}
              </span>
              <span className="text-muted-foreground text-xs">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "size-3.5",
                    s <= Math.round(avgRating)
                      ? "fill-primary text-primary"
                      : "text-muted-foreground/30 fill-transparent",
                  )}
                />
              ))}
              <span className="text-muted-foreground ml-1.5 text-xs">（共 {totalRated} 筆評價）</span>
            </div>
          </div>

          {/* Response Rate */}
          <div className="border-border/60 bg-muted/20 flex flex-col justify-between rounded-xl border p-4">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>評分回應率</span>
              <TrendingUp className="text-primary size-4" />
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-foreground text-3xl font-bold tracking-tight tabular-nums">{responseRate}%</span>
            </div>
            <p className="text-muted-foreground text-xs">
              已結案 {totalClosed} 件中，{totalRated} 件通報人完成評分
            </p>
          </div>

          {/* Top Technician highlight */}
          <div className="border-border/60 bg-muted/20 flex flex-col justify-between rounded-xl border p-4">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>最佳滿意度技師</span>
              <Award className="text-primary size-4" />
            </div>
            <div className="my-2">
              {technicianRankings.length > 0 && technicianRankings[0].ratedCount > 0 ? (
                <>
                  <div className="text-foreground truncate text-lg font-bold">{technicianRankings[0].displayName}</div>
                  <div className="text-foreground flex items-center gap-1.5 text-xs font-medium">
                    <Star className="fill-primary text-primary size-3.5" />
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
            <p className="text-muted-foreground text-xs">依技師平均評分與件數綜合排序</p>
          </div>
        </div>

        {!hasData ? (
          <Empty className="border border-dashed py-10">
            <EmptyMedia variant="icon">
              <Star />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyDescription>此篩選時段內尚無已評分之結案工單</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Rating Distribution */}
            <div className="border-border/60 bg-card space-y-3 rounded-xl border p-4">
              <div className="border-border/40 flex items-center justify-between border-b pb-2">
                <span className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                  <BarChart2 className="text-primary size-3.5" />
                  星等評價分佈
                </span>
                <span className="text-muted-foreground text-xs">共 {totalRated} 筆有效評分</span>
              </div>

              <div className="space-y-2.5 pt-1">
                {distribution.map((d) => (
                  <div key={d.star} className="flex items-center gap-3 text-xs">
                    <div className="text-foreground flex w-14 shrink-0 items-center gap-1 font-medium">
                      <span>{d.star} 星</span>
                      <Star className="fill-primary text-primary size-3" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary transition-width h-full rounded-full duration-300"
                          style={{ width: `${d.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-muted-foreground w-16 shrink-0 text-right text-xs tabular-nums">
                      {d.count} 件 ({d.percentage}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Trend Chart */}
            <div className="border-border/60 bg-card space-y-3 rounded-xl border p-4">
              <div className="border-border/40 flex items-center justify-between border-b pb-2">
                <span className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                  <TrendingUp className="text-primary size-3.5" />
                  各月份滿意度趨勢
                </span>
                <span className="text-muted-foreground text-xs">平均分數走勢</span>
              </div>

              {monthlyTrends.length === 0 ? (
                <div className="text-muted-foreground flex h-36 items-center justify-center text-xs">
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
                      className="text-xs"
                    />
                    <YAxis
                      domain={[1, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-xs"
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
          <div className="border-border/60 bg-card space-y-3 rounded-xl border p-4">
            <div className="border-border/40 flex items-center justify-between border-b pb-2">
              <span className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                <Users className="text-primary size-3.5" />
                維修工程人員滿意度排行榜
              </span>
              <span className="text-muted-foreground text-xs">依滿意度與評分量綜合排行</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2 lg:grid-cols-3">
              {technicianRankings.map((tech, index) => {
                const isTop3 = index < 3;
                return (
                  <div
                    key={tech.technicianId}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3 text-xs transition-colors",
                      isTop3
                        ? "border-primary/30 bg-primary/5 hover:border-primary/50"
                        : "border-border/50 bg-muted/20 hover:border-border",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          index < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {index + 1}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-foreground block max-w-[120px] truncate font-semibold">
                          {tech.displayName}
                        </span>
                        <span className="text-foreground/80 block text-xs">
                          總完工: {tech.completedCount} 件 | 已評: {tech.ratedCount} 筆
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {tech.ratedCount > 0 ? (
                        <div className="flex items-center gap-1">
                          <Star className="fill-primary text-primary size-3.5" />
                          <span className="text-foreground text-sm font-bold tabular-nums">
                            {tech.avgRating.toFixed(1)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-foreground/80 text-xs italic">尚無評分</span>
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
