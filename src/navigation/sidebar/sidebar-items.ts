import {
  BarChart3,
  ClipboardList,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Package,
  QrCode,
  Settings,
} from "lucide-react";

export interface NavItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "維修管理",
    items: [
      {
        id: "dashboard",
        title: "總覽儀表板",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        id: "tickets",
        title: "報修單管理",
        url: "/dashboard/tickets",
        icon: ClipboardList,
      },
    ],
  },
  {
    id: 2,
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
    id: 3,
    label: "系統管理",
    items: [
      {
        id: "equipment",
        title: "設備管理",
        url: "/dashboard/equipment",
        icon: Package,
      },
      {
        id: "qr-codes",
        title: "QR Code 管理",
        url: "/dashboard/qr-codes",
        icon: QrCode,
      },
      {
        id: "reports",
        title: "統計報表",
        url: "/dashboard/reports",
        icon: BarChart3,
      },
      {
        id: "settings",
        title: "系統設定",
        url: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];
