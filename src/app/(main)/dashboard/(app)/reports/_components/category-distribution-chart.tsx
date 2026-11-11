"use client";

import { useMemo } from "react";

import { Tags } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { CategoryDistributionStat } from "./report-types";

interface CategoryDistributionChartProps {
  data: CategoryDistributionStat[];
}

export function CategoryDistributionChart({ data }: CategoryDistributionChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.count > 0);

  const chartData = useMemo(() => {
    if (data.length <= 10) {
      return data;
    }

    const other = data
      .slice(10)
      .reduce((sum, row) => ({ count: sum.count + row.count, percentage: sum.percentage + row.percentage }), {
        count: 0,
        percentage: 0,
      });

    return [
      ...data.slice(0, 10),
      {
        categoryId: "__other__",
        categoryName: "其他",
        count: other.count,
        percentage: Number(other.percentage.toFixed(1)),
        fill: "var(--muted-foreground)",
      },
    ];
  }, [data]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-start pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Tags className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="font-semibold text-base">維修分類分佈</CardTitle>
            <CardDescription className="text-xs">各項維修項目類別之工單佔比分析</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-2 pb-4">
        {!hasData ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground text-xs">
            此期間無相關工單數據
          </div>
        ) : (
          <div className="space-y-3">
            {chartData.map((item) => (
              <div key={item.categoryId} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate text-muted-foreground">{item.categoryName}</span>
                  <span className="shrink-0 font-medium text-foreground tabular-nums">
                    {item.count} 件 ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.fill || "var(--chart-1)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
