import Link from "next/link";

import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  type LucideIcon,
  Megaphone,
  Package,
  QrCode,
  Settings,
} from "lucide-react";

import type { UserRole } from "@/lib/users/projection";

interface QuickLink {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}

const quickLinks: QuickLink[] = [
  {
    title: "報修單管理",
    description: "檢視、審核、指派與更新案件",
    href: "/dashboard/tickets",
    icon: ClipboardList,
    roles: ["admin", "technician"],
  },
  {
    title: "維修紀錄",
    description: "查詢維修歷史與回報細節",
    href: "/dashboard/repair-records",
    icon: ClipboardCheck,
    roles: ["admin", "technician"],
  },
  {
    title: "統計報表",
    description: "趨勢、完修率與分類統計",
    href: "/dashboard/reports",
    icon: BarChart3,
    roles: ["admin"],
  },
  {
    title: "設備管理",
    description: "維護設備清冊與保固狀態",
    href: "/dashboard/equipment",
    icon: Package,
    roles: ["admin"],
  },
  {
    title: "QR Code 管理",
    description: "管理快速報修 QR 標籤",
    href: "/dashboard/qr-codes",
    icon: QrCode,
    roles: ["admin"],
  },
  {
    title: "公告管理",
    description: "發佈修繕通知與公告",
    href: "/dashboard/announcements",
    icon: Megaphone,
    roles: ["admin"],
  },
  {
    title: "系統設定",
    description: "維護類別、地點與權限",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["admin"],
  },
];

export function DashboardQuickLinks({ role }: { role: UserRole }) {
  const visibleLinks = quickLinks.filter((item) => item.roles.includes(role));

  return (
    <div>
      <h2 className="text-foreground mb-3 text-sm font-semibold">快速導航</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group border-border bg-card hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-ring/50 flex items-center gap-3 rounded-xl border p-3 transition-colors focus-visible:ring-3 focus-visible:outline-none"
            >
              <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors">
                <Icon className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-foreground group-hover:text-primary text-sm font-medium">{item.title}</p>
                <p className="text-muted-foreground truncate text-xs">{item.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
