"use client";

import { BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
    color: "hsl(var(--chart-1))",
  },
  completed: {
    label: "已完成/結案",
    color: "hsl(var(--chart-2))",
  },
  pendingOrProgress: {
    label: "處理中/待處理",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

export function MonthlyTicketsChart({ data }: MonthlyTicketsChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.total > 0);

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
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={8}
                axisLine={false}
                tickFormatter={(value) => `${value.slice(5)}月`}
                className="text-[11px]"
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} className="text-[11px]" />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="completed" fill="var(--color-completed)" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
