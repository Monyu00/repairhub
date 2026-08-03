import { ClipboardList, FileText, LayoutDashboard, type LucideIcon, Settings } from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
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
        id: "settings",
        title: "系統設定",
        url: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];
