"use client";

import { useMemo, useState, useTransition } from "react";

import { CheckCircle2, Clock, Edit2, Globe, Lock, Megaphone, Pin, Plus, Radio, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  type AnnouncementAudience,
  type AnnouncementItem,
  type CreateAnnouncementInput,
  createAnnouncement,
  deleteAnnouncement,
  type UpdateAnnouncementInput,
  updateAnnouncement,
} from "@/server/announcements";

import { AnnouncementDialog } from "./announcement-dialog";
import { DeleteAnnouncementDialog } from "./delete-announcement-dialog";

interface AnnouncementsPageProps {
  initialAnnouncements: AnnouncementItem[];
}

type FilterStatus = "all" | "active" | "expired" | "pinned";

export function AnnouncementsPage({ initialAnnouncements }: AnnouncementsPageProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(initialAnnouncements);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [audienceFilter, setAudienceFilter] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<AnnouncementItem | null>(null);

  const [_isPending, _startTransition] = useTransition();

  // Statistics calculation
  const stats = useMemo(() => {
    const now = Date.now();
    let active = 0;
    let expired = 0;
    let pinned = 0;

    for (const a of announcements) {
      if (a.is_pinned) pinned++;
      const isExp = a.expires_at ? new Date(a.expires_at).getTime() <= now : false;
      if (isExp) {
        expired++;
      } else {
        active++;
      }
    }

    return { total: announcements.length, active, expired, pinned };
  }, [announcements]);

  // Filtered announcements
  const filteredAnnouncements = useMemo(() => {
    const now = Date.now();
    return announcements.filter((a) => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = a.title.toLowerCase().includes(query);
        const matchBody = a.body.toLowerCase().includes(query);
        if (!matchTitle && !matchBody) return false;
      }

      // Audience filter
      if (audienceFilter !== "all" && a.audience !== audienceFilter) {
        return false;
      }

      // Status filter
      const isExp = a.expires_at ? new Date(a.expires_at).getTime() <= now : false;
      if (statusFilter === "active" && isExp) return false;
      if (statusFilter === "expired" && !isExp) return false;
      if (statusFilter === "pinned" && !a.is_pinned) return false;

      return true;
    });
  }, [announcements, searchQuery, audienceFilter, statusFilter]);

  const handleCreateOpen = () => {
    setEditingAnnouncement(null);
    setDialogOpen(true);
  };

  const handleEditOpen = (item: AnnouncementItem) => {
    setEditingAnnouncement(item);
    setDialogOpen(true);
  };

  const handleDeleteOpen = (item: AnnouncementItem) => {
    setDeletingAnnouncement(item);
    setDeleteDialogOpen(true);
  };

  const handleDialogSubmit = async (
    data: CreateAnnouncementInput | UpdateAnnouncementInput,
  ): Promise<{ success: boolean; error?: string | null }> => {
    if (editingAnnouncement) {
      const res = await updateAnnouncement(editingAnnouncement.id, data);
      if (res.success) {
        toast.success("公告已成功更新");
        setAnnouncements((prev) =>
          prev.map((item) =>
            item.id === editingAnnouncement.id
              ? {
                  ...item,
                  ...data,
                  updated_at: new Date().toISOString(),
                }
              : item,
          ),
        );
        return { success: true };
      }
      return { success: false, error: res.error };
    }

    const res = await createAnnouncement(data as CreateAnnouncementInput);
    if (res.success && res.id) {
      toast.success("公告發佈成功");
      // Add optimistic item
      const newItem: AnnouncementItem = {
        id: res.id,
        title: data.title ?? "",
        body: data.body ?? "",
        audience: (data.audience as AnnouncementAudience) ?? "all",
        is_pinned: Boolean(data.is_pinned),
        author_id: "",
        published_at: data.published_at ?? new Date().toISOString(),
        expires_at: data.expires_at ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: { display_name: "我" },
      };
      setAnnouncements((prev) => [newItem, ...prev]);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAnnouncement) return;
    const res = await deleteAnnouncement(deletingAnnouncement.id);
    if (res.success) {
      toast.success("公告已刪除");
      setAnnouncements((prev) => prev.filter((item) => item.id !== deletingAnnouncement.id));
    } else {
      toast.error(res.error ?? "刪除失敗");
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const renderAudienceBadge = (audience: AnnouncementAudience) => {
    switch (audience) {
      case "all":
        return (
          <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-primary text-xs">
            <Radio className="size-3" />
            全體對象
          </Badge>
        );
      case "internal":
        return (
          <Badge variant="secondary" className="gap-1 bg-muted text-foreground text-xs">
            <Lock className="size-3" />
            僅內部
          </Badge>
        );
      case "public":
        return (
          <Badge
            variant="outline"
            className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 text-xs dark:text-amber-400"
          >
            <Globe className="size-3" />
            前台公開
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Megaphone className="size-5" />
            </div>
            <h1 className="font-bold font-heading text-2xl text-foreground tracking-tight">公告管理</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            發佈全校修繕營運通知、重要停機提醒，並可自訂可見對象與置頂排程。
          </p>
        </div>

        <Button onClick={handleCreateOpen} className="gap-1.5 self-start sm:self-auto">
          <Plus className="size-4" />
          發佈新公告
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-muted-foreground text-xs">全部公告</CardTitle>
            <Megaphone className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-foreground">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-muted-foreground text-xs">生效中</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-emerald-600 dark:text-emerald-400">{stats.active}</div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-muted-foreground text-xs">置頂公告</CardTitle>
            <Pin className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-primary">{stats.pinned}</div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-muted-foreground text-xs">已到期</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-muted-foreground">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜尋公告標題或內容關鍵字..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-border bg-muted/30 p-1">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`rounded-md px-2.5 py-1 font-medium text-xs transition-colors ${
                    statusFilter === "all"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  全部
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className={`rounded-md px-2.5 py-1 font-medium text-xs transition-colors ${
                    statusFilter === "active"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  生效中
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("pinned")}
                  className={`rounded-md px-2.5 py-1 font-medium text-xs transition-colors ${
                    statusFilter === "pinned"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  置頂
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("expired")}
                  className={`rounded-md px-2.5 py-1 font-medium text-xs transition-colors ${
                    statusFilter === "expired"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  已到期
                </button>
              </div>

              <select
                value={audienceFilter}
                onChange={(e) => setAudienceFilter(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-foreground text-xs focus:outline-hidden"
              >
                <option value="all">所有受眾</option>
                <option value="internal">僅內部</option>
                <option value="public">僅公開</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcements Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">公告列表</CardTitle>
          <CardDescription>
            共 {filteredAnnouncements.length} 則公告。置頂公告將依序排在前端，並標示圖示。
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">置頂</TableHead>
                  <TableHead className="min-w-[200px]">標題與內文</TableHead>
                  <TableHead className="w-28">受眾範圍</TableHead>
                  <TableHead className="w-40">發佈時間</TableHead>
                  <TableHead className="w-40">到期時間</TableHead>
                  <TableHead className="w-28">發佈者</TableHead>
                  <TableHead className="w-24 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnnouncements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-sm">
                      查無符合條件的公告
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAnnouncements.map((item) => {
                    const isExp = item.expires_at ? new Date(item.expires_at).getTime() <= Date.now() : false;
                    const isEdited = new Date(item.updated_at).getTime() - new Date(item.created_at).getTime() > 1000;

                    return (
                      <TableRow key={item.id} className={isExp ? "bg-muted/20 opacity-60" : ""}>
                        <TableCell className="text-center">
                          {item.is_pinned ? (
                            <Pin className="inline size-4 text-primary" />
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{item.title}</span>
                              {isExp && (
                                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] text-muted-foreground">
                                  已到期
                                </Badge>
                              )}
                              {isEdited && (
                                <Badge variant="outline" className="px-1.5 py-0 text-[10px] text-muted-foreground">
                                  已編輯
                                </Badge>
                              )}
                            </div>
                            <p className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">{item.body}</p>
                          </div>
                        </TableCell>

                        <TableCell>{renderAudienceBadge(item.audience)}</TableCell>

                        <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                          {formatDateTime(item.published_at)}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                          {item.expires_at ? (
                            <span className={isExp ? "font-medium text-destructive/80" : ""}>
                              {formatDateTime(item.expires_at)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">永不過期</span>
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                          {item.author?.display_name || "系統人員"}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => handleEditOpen(item)} title="編輯">
                              <Edit2 className="size-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteOpen(item)}
                              title="刪除"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit / Create Dialog */}
      <AnnouncementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        announcement={editingAnnouncement}
        onSubmit={handleDialogSubmit}
      />

      {/* Delete Confirmation Alert Dialog */}
      <DeleteAnnouncementDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        announcement={deletingAnnouncement}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
