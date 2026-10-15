import { CalendarPlus, ClipboardList, Timer, Wrench } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { DashboardSummary } from "../_actions/dashboard-summary";

interface DashboardSummaryCardsProps {
  summary: DashboardSummary;
  isAdmin: boolean;
}

export function DashboardSummaryCards({ summary, isAdmin }: DashboardSummaryCardsProps) {
  const cards = [
    {
      title: isAdmin ? "待處理" : "待接單",
      description: isAdmin ? "全校未派工案件" : "訂閱類別新通報",
      value: `${summary.pendingCount}`,
      unit: "件",
      icon: ClipboardList,
    },
    {
      title: "今日新增",
      description: isAdmin ? "全校今日回報" : "訂閱類別今日回報",
      value: `${summary.todayCount}`,
      unit: "件",
      icon: CalendarPlus,
    },
    {
      title: isAdmin ? "維修中" : "我的維修中",
      description: isAdmin ? "目前處理中案件" : "指派給我的案件",
      value: `${summary.inProgressCount}`,
      unit: "件",
      icon: Wrench,
    },
    {
      title: isAdmin ? "平均修復時長" : "我的平均修復",
      description: "近 90 天完工案件",
      value: summary.avgResolutionDays.toFixed(1),
      unit: "天",
      icon: Timer,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.title} className="p-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-2">
              <CardTitle className="font-medium text-muted-foreground text-sm">{card.title}</CardTitle>
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Icon className="size-4" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="font-bold text-2xl text-foreground tabular-nums tracking-tight">
                {card.value}
                <span className="ml-1 font-normal text-muted-foreground text-xs">{card.unit}</span>
              </div>
              <p className="mt-1 text-muted-foreground text-xs">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
