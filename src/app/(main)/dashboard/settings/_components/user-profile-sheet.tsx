"use client";

import { useEffect, useState, useTransition } from "react";

import {
  Ban,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  FileText,
  KeyRound,
  Loader2,
  Phone,
  Power,
  Tag,
  Wrench,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import type { CategoryItem } from "../_actions/category-actions";
import { fetchUserStats, type UserItem, type UserStats } from "../_actions/user-actions";
import { UserRoleBadge } from "./user-role-badge";

interface UserProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserItem | null;
  categories: CategoryItem[];
  technicianCategoryIds: string[];
  onEdit: (user: UserItem) => void;
  onResetPassword: (user: UserItem) => void;
  onToggleActive: (user: UserItem) => void;
  onManageCategories: (user: UserItem) => void;
}

export function UserProfileSheet({
  open,
  onOpenChange,
  user,
  categories,
  technicianCategoryIds,
  onEdit,
  onResetPassword,
  onToggleActive,
  onManageCategories,
}: UserProfileSheetProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoadingStats, startStatsTransition] = useTransition();

  useEffect(() => {
    if (open && user) {
      setStats(null);
      startStatsTransition(async () => {
        const res = await fetchUserStats(user.id, user.email, user.role);
        if (res.success && res.stats) {
          setStats(res.stats);
        }
      });
    }
  }, [open, user]);

  if (!user) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "未曾登入";
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name?.trim()) {
      return name.trim().slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const subscribedCategories = technicianCategoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is CategoryItem => Boolean(c));

  const isTech = user.role === "technician";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full space-y-6 overflow-y-auto p-6 sm:max-w-md">
        <SheetHeader className="p-0 text-left">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 border-2 border-border font-semibold text-base shadow-xs">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(user.displayName, user.email)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate font-bold text-xl">{user.displayName ?? "（未設定姓名）"}</SheetTitle>
              <SheetDescription className="mt-0.5 truncate font-mono text-muted-foreground text-xs">
                {user.email}
              </SheetDescription>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <UserRoleBadge role={user.role} />
                {user.isActive ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-normal text-emerald-700 text-xs dark:text-emerald-400"
                  >
                    <CheckCircle2 className="size-3" />
                    <span>正常啟用</span>
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1 border-destructive/20 bg-destructive/10 px-2 py-0.5 font-normal text-destructive text-xs"
                  >
                    <Ban className="size-3" />
                    <span>已停用</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Action Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="min-w-[120px] flex-1" onClick={() => onEdit(user)}>
            <Edit2 className="mr-1.5 h-3.5 w-3.5" />
            編輯資料
          </Button>

          <Button variant="outline" size="sm" className="min-w-[120px] flex-1" onClick={() => onResetPassword(user)}>
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            重設密碼
          </Button>

          {isTech && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-blue-600 hover:text-blue-700 dark:text-blue-400"
              onClick={() => onManageCategories(user)}
            >
              <Tag className="mr-1.5 h-3.5 w-3.5" />
              負責報修類別 ({subscribedCategories.length})
            </Button>
          )}

          <Button
            variant={user.isActive ? "destructive" : "default"}
            size="sm"
            className="w-full"
            onClick={() => onToggleActive(user)}
          >
            <Power className="mr-1.5 h-3.5 w-3.5" />
            {user.isActive ? "停用此使用者帳號" : "重新啟用此使用者帳號"}
          </Button>
        </div>

        <Separator />

        {/* Detailed Information */}
        <div className="space-y-3">
          <h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">帳號詳細資料</h4>

          <div className="space-y-3 rounded-lg border bg-card p-3.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground text-xs">
                <Building className="h-3.5 w-3.5" />
                所屬部門 / 單位
              </span>
              <span className="font-medium text-foreground text-xs">{user.department ?? "—"}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground text-xs">
                <Phone className="h-3.5 w-3.5" />
                聯絡電話 / 分機
              </span>
              <span className="font-medium font-mono text-foreground text-xs">{user.phone ?? "—"}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground text-xs">
                <Calendar className="h-3.5 w-3.5" />
                帳號建立日期
              </span>
              <span className="text-muted-foreground text-xs">{formatDate(user.createdAt)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground text-xs">
                <Clock className="h-3.5 w-3.5" />
                最後登入時間
              </span>
              <span className="text-muted-foreground text-xs">{formatDate(user.lastSignInAt)}</span>
            </div>
          </div>
        </div>

        {/* Technician Categories (if tech) */}
        {isTech && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                擅長與負責報修類別
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-primary"
                onClick={() => onManageCategories(user)}
              >
                變更
              </Button>
            </div>

            {subscribedCategories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {subscribedCategories.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant="secondary"
                    className="border-blue-200 bg-blue-500/10 px-2.5 py-1 font-normal text-blue-700 text-xs dark:border-blue-800/40 dark:text-blue-300"
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-amber-600 text-xs italic dark:text-amber-400">
                尚未指定任何負責之報修類別，請點擊上方按鈕進行指派。
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* Ticket Activity & Statistics */}
        <div className="space-y-3">
          <h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">報修統計與活動紀錄</h4>

          {isLoadingStats && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span className="text-xs">載入報修統計中...</span>
            </div>
          )}

          {!isLoadingStats && !stats && <p className="py-4 text-center text-muted-foreground text-xs">無統計資料</p>}

          {!isLoadingStats && stats && (
            <div className="space-y-4">
              {/* Reporter Stats */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
                    <FileText className="h-3.5 w-3.5" />
                    個人通報紀錄
                  </span>
                  <span className="font-bold text-xs">{stats.reporterStats.total} 筆通報</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Card className="p-2.5 text-center shadow-2xs">
                    <div className="font-bold text-amber-600 text-lg dark:text-amber-400">
                      {stats.reporterStats.pending}
                    </div>
                    <div className="text-[11px] text-muted-foreground">待處理</div>
                  </Card>

                  <Card className="p-2.5 text-center shadow-2xs">
                    <div className="font-bold text-blue-600 text-lg dark:text-blue-400">
                      {stats.reporterStats.inProgress}
                    </div>
                    <div className="text-[11px] text-muted-foreground">處理中</div>
                  </Card>

                  <Card className="p-2.5 text-center shadow-2xs">
                    <div className="font-bold text-emerald-600 text-lg dark:text-emerald-400">
                      {stats.reporterStats.completed + stats.reporterStats.closed}
                    </div>
                    <div className="text-[11px] text-muted-foreground">已完成/結案</div>
                  </Card>
                </div>
              </div>

              {/* Technician Stats */}
              {stats.technicianStats && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
                      <Wrench className="h-3.5 w-3.5 text-blue-500" />
                      技師工單指派與處置
                    </span>
                    <span className="font-bold text-blue-600 text-xs dark:text-blue-400">
                      {stats.technicianStats.totalAssigned} 筆指派
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Card className="border-blue-200 bg-blue-500/5 p-2.5 text-center shadow-2xs dark:border-blue-900/40">
                      <div className="font-bold text-blue-600 text-lg dark:text-blue-400">
                        {stats.technicianStats.inProgress}
                      </div>
                      <div className="text-[11px] text-muted-foreground">目前處置中工單</div>
                    </Card>

                    <Card className="border-emerald-200 bg-emerald-500/5 p-2.5 text-center shadow-2xs dark:border-emerald-900/40">
                      <div className="font-bold text-emerald-600 text-lg dark:text-emerald-400">
                        {stats.technicianStats.completedOrClosed}
                      </div>
                      <div className="text-[11px] text-muted-foreground">已修復完成工單</div>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
