import Link from "next/link";

import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  ExternalLink,
  Package,
  QrCode,
  Settings,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/server/auth/session";

export default async function DashboardPage() {
  const session = await getSession();
  const isAdmin = session?.role === "admin";
  const roleName = isAdmin ? "系統管理者" : "維修技師";

  const quickLinks = [
    {
      title: "報修單管理",
      description: "檢視、審核、指派與更新所有案件進度",
      href: "/dashboard/tickets",
      icon: ClipboardList,
      roles: ["admin", "technician"],
    },
    {
      title: "維修紀錄",
      description: "查詢技師維修紀錄、工單歷史與回報細節",
      href: "/dashboard/repair-records",
      icon: ClipboardCheck,
      roles: ["admin", "technician"],
    },
    {
      title: "統計報表",
      description: "報修案件趨勢、完修率與分類統計分析",
      href: "/dashboard/reports",
      icon: BarChart3,
      roles: ["admin"],
    },
    {
      title: "設備管理",
      description: "維護校園設備清冊、保養狀態與位置對應",
      href: "/dashboard/equipment",
      icon: Package,
      roles: ["admin"],
    },
    {
      title: "QR Code 管理",
      description: "產生並管理空間與設備的快速報修 QR 標籤",
      href: "/dashboard/qr-codes",
      icon: QrCode,
      roles: ["admin"],
    },
    {
      title: "系統設定",
      description: "維護報修類別、校舍空間地點與使用者權限",
      href: "/dashboard/settings",
      icon: Settings,
      roles: ["admin"],
    },
  ];

  const visibleLinks = quickLinks.filter((item) => item.roles.includes(session?.role ?? ""));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="font-bold font-heading text-2xl text-foreground tracking-tight">管理後台</h1>
            <Badge variant="secondary" className="gap-1 px-2.5 py-0.5">
              <ShieldCheck className="size-3.5 text-primary" />
              {roleName}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            歡迎回來，<span className="font-medium text-foreground">{session?.displayName ?? session?.email}</span>
            。請選擇下方模組進行管理操作。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/" className="gap-1.5">
              前台首頁
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/report" className="gap-1.5">
              <Wrench className="size-3.5" />
              新增報修
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div>
        <h2 className="mb-3 font-semibold text-foreground text-lg">快速導航</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group block">
                <Card className="h-full border border-border transition-all hover:border-primary/40 hover:shadow-xs">
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="font-semibold text-base text-foreground group-hover:text-primary">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs leading-relaxed">{item.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
