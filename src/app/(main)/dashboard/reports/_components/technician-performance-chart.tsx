"use client";

import { UserCheck } from "lucide-react";
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

import type { TechnicianPerformanceStat } from "./report-types";

interface TechnicianPerformanceChartProps {
  data: TechnicianPerformanceStat[];
}

const chartConfig = {
  completedCount: {
    label: "已完成工單",
    color: "hsl(var(--chart-2))",
  },
  inProgressCount: {
    label: "處理中工單",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

export function TechnicianPerformanceChart({ data }: TechnicianPerformanceChartProps) {
  const hasData = data.length > 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-start pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <UserCheck className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="font-semibold text-base">技師處理績效與負載</CardTitle>
            <CardDescription className="text-xs">統計各維修工程人員之完成工單量與平均處理時效</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-2 pb-4">
        {!hasData ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground text-xs">
            此期間尚無技師派工紀錄
          </div>
        ) : (
          <div className="space-y-4">
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart layout="vertical" data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/40" />
                <YAxis
                  type="category"
                  dataKey="displayName"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="font-medium text-[11px]"
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  allowDecimals={false}
                  className="text-[11px]"
                />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="completedCount"
                  fill="var(--color-completedCount)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={24}
                />
                <Bar
                  dataKey="inProgressCount"
                  fill="var(--color-inProgressCount)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ChartContainer>

            {/* Technician Summary Table/Badges */}
            <div className="grid grid-cols-1 gap-2 border-border/40 border-t pt-2 sm:grid-cols-2">
              {data.map((tech) => (
                <div
                  key={tech.technicianId}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 p-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                      {tech.displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{tech.displayName}</div>
                      <div className="text-[10px] text-muted-foreground">
                        已完成: {tech.completedCount} 件 | 進行中: {tech.inProgressCount} 件
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground tabular-nums">
                      {tech.avgDaysToResolve > 0 ? `${tech.avgDaysToResolve} 天` : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">平均修復</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
