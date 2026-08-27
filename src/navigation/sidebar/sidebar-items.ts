import {
  BarChart3,
  ClipboardList,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Package,
  QrCode,
  Settings,
  Wrench,
} from "lucide-react";

import type { Database } from "@/lib/supabase/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export interface NavChildItem {
  id: string;
  title: string;
  url: string;
  roles?: UserRole[];
}

export interface NavItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  roles?: UserRole[];
  children?: NavChildItem[];
}

export interface NavGroup {
  id: number;
  label?: string;
  roles?: UserRole[];
  items: NavItem[];
}

export const reportAction = {
  title: "我要報修",
  url: "/report",
  icon: Wrench,
};

export const sidebarItems: NavGroup[] = [
  {
    id: 0,
    items: [
      {
        id: "dashboard",
        title: "總覽儀表板",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 1,
    label: "個人",
    items: [
      {
        id: "my-tickets",
        title: "我的報修紀錄",
        url: "/dashboard/my-tickets",
        icon: FileText,
      },
    ],
  },
  {
    id: 2,
    label: "維修管理",
    roles: ["admin", "technician"],
    items: [
      {
        id: "tickets",
        title: "報修單管理",
        url: "/dashboard/tickets",
        icon: ClipboardList,
        roles: ["admin", "technician"],
      },
    ],
  },
  {
    id: 3,
    label: "系統管理",
    roles: ["admin"],
    items: [
      {
        id: "reports",
        title: "統計報表",
        url: "/dashboard/reports",
        icon: BarChart3,
        roles: ["admin"],
      },
      {
        id: "equipment",
        title: "設備管理",
        url: "/dashboard/equipment",
        icon: Package,
        roles: ["admin"],
      },
      {
        id: "qr-codes",
        title: "QR Code 管理",
        url: "/dashboard/qr-codes",
        icon: QrCode,
        roles: ["admin"],
        children: [
          {
            id: "qr-codes-spaces",
            title: "空間 QR Code",
            url: "/dashboard/qr-codes?tab=spaces",
          },
          {
            id: "qr-codes-equipment",
            title: "設備 QR Code",
            url: "/dashboard/qr-codes?tab=equipment",
          },
        ],
      },
      {
        id: "settings",
        title: "系統設定",
        url: "/dashboard/settings",
        icon: Settings,
        roles: ["admin"],
        children: [
          {
            id: "settings-categories",
            title: "類別管理",
            url: "/dashboard/settings?tab=categories",
          },
          {
            id: "settings-locations",
            title: "地點管理",
            url: "/dashboard/settings?tab=locations",
          },
          {
            id: "settings-users",
            title: "使用者管理",
            url: "/dashboard/settings?tab=users",
          },
        ],
      },
    ],
  },
];
