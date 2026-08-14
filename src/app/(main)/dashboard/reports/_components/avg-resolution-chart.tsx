"use client";

import { Clock } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import type { AvgResolutionTimeStat } from "./report-types";

interface AvgResolutionChartProps {
  data: AvgResolutionTimeStat[];
}

const chartConfig = {
  avgDays: {
    label: "平均處理時間 (天)",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function AvgResolutionChart({ data }: AvgResolutionChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.completedCount > 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-start pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="font-semibold text-base">平均維修處理時效趨勢</CardTitle>
            <CardDescription className="text-xs">每月已完成工單從通報至結案之平均天數</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-2 pb-4">
        {!hasData ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground text-xs">
            此期間無已結案工單數據
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fillAvgDays" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-avgDays)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-avgDays)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={8}
                axisLine={false}
                tickFormatter={(value) => `${value.slice(5)}月`}
                className="text-[11px]"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                unit=" 天"
                className="text-[11px]"
                domain={[0, "auto"]}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(value, name) => (
                      <div className="flex min-w-28 items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-medium text-foreground">{value} 天</span>
                      </div>
                    )}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="avgDays"
                stroke="var(--color-avgDays)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#fillAvgDays)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
