"use client";

import { BarChart3 } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import type { MonthlyTicketStat } from "./report-types";

interface MonthlyTicketsChartProps {
  data: MonthlyTicketStat[];
}

const chartConfig = {
  total: {
    label: "總通報數",
    color: "var(--chart-1)",
  },
  completed: {
    label: "已完成/結案",
    color: "var(--chart-2)",
  },
  pendingOrProgress: {
    label: "處理中/待處理",
    color: "var(--chart-4)",
  },
  other: {
    label: "其他狀態",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig;

export function MonthlyTicketsChart({ data }: MonthlyTicketsChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.total > 0);
  const chartData = data.map((row) => ({
    ...row,
    other: Math.max(0, row.total - row.completed - row.pendingOrProgress),
    completionRate: row.total > 0 ? Number(((row.completed / row.total) * 100).toFixed(1)) : 0,
  }));

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-start pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="font-semibold text-base">每月工單數量趨勢</CardTitle>
            <CardDescription className="text-xs">統計各月份通報工單總數與處理狀況</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-2 pb-4">
        {!hasData ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground text-xs">
            此期間無相關工單數據
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={8}
                axisLine={false}
                tickFormatter={(value) => `${value.slice(5)}月`}
                className="text-xs"
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} className="text-xs" />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    formatter={(value, name, item) => (
                      <div className="flex min-w-28 items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-medium text-foreground tabular-nums">
                          {value}
                          {item.dataKey === "total" ? ` (${item.payload.completionRate}%)` : ""}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="completed" stackId="status" fill="var(--color-completed)" maxBarSize={32} />
              <Bar dataKey="pendingOrProgress" stackId="status" fill="var(--color-pendingOrProgress)" maxBarSize={32} />
              <Bar dataKey="other" stackId="status" fill="var(--color-other)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Line dataKey="total" stroke="var(--color-total)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
