"use client";

import { useMemo } from "react";

import { Building2 } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import type { BuildingDistributionStat } from "./report-types";

interface BuildingDistributionChartProps {
  data: BuildingDistributionStat[];
}

export function BuildingDistributionChart({ data }: BuildingDistributionChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.count > 0);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      count: {
        label: "工單件數",
      },
    };
    data.forEach((item, index) => {
      config[item.buildingId] = {
        label: item.buildingName,
        color: item.fill || `hsl(var(--chart-${(index % 5) + 1}))`,
      };
    });
    return config;
  }, [data]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-start pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="font-semibold text-base">建築物工單分佈</CardTitle>
            <CardDescription className="text-xs">各校區建築設施之通報數量與比率</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-2 pb-4">
        {!hasData ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground text-xs">
            此期間無相關工單數據
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[220px] w-full">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => (
                        <div className="flex min-w-24 items-center justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">{name}</span>
                          <span className="font-medium text-foreground">{value} 件</span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="buildingName"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {data.map((entry, index) => (
                    <Cell key={entry.buildingId} fill={entry.fill || `hsl(var(--chart-${(index % 5) + 1}))`} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Side Legends */}
            <div className="flex w-full flex-col gap-2 md:w-48">
              {data.map((item) => (
                <div key={item.buildingId} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-xs"
                      style={{ backgroundColor: item.fill || "hsl(var(--primary))" }}
                    />
                    <span className="truncate text-muted-foreground">{item.buildingName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-foreground tabular-nums">
                    <span>{item.count} 件</span>
                    <span className="text-[10px] text-muted-foreground">({item.percentage}%)</span>
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
