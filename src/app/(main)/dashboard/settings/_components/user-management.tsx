"use client";

import { useMemo, useState, useTransition } from "react";

import {
  Ban,
  Edit2,
  Eye,
  KeyRound,
  Loader2,
  Power,
  Search,
  Tag,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { CategoryItem } from "../_actions/category-actions";
import { fetchUsers, toggleUserActive, type UserItem, updateUserProfile } from "../_actions/user-actions";
import { TechnicianCategoryDialog } from "./technician-category-dialog";
import { UserCreateDialog } from "./user-create-dialog";
import { UserCreateSuccessDialog } from "./user-create-success-dialog";
import { UserEditDialog } from "./user-edit-dialog";
import { UserProfileSheet } from "./user-profile-sheet";
import { UserResetPasswordDialog } from "./user-reset-password-dialog";
import { UserRoleBadge } from "./user-role-badge";

interface UserManagementProps {
  initialUsers: UserItem[];
  categories: CategoryItem[];
  initialTechnicianCategoryMap?: Record<string, string[]>;
}

export function UserManagement({ initialUsers, categories, initialTechnicianCategoryMap = {} }: UserManagementProps) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [technicianCategoryMap, setTechnicianCategoryMap] =
    useState<Record<string, string[]>>(initialTechnicianCategoryMap);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active"); // default: 'active'

  // Dialog & Sheet states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createSuccessData, setCreateSuccessData] = useState<{ email: string; password: string } | null>(null);

  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);

  const [techCategoryDialogOpen, setTechCategoryDialogOpen] = useState(false);
  const [selectedTechUser, setSelectedTechUser] = useState<UserItem | null>(null);

  const [confirmToggleUser, setConfirmToggleUser] = useState<UserItem | null>(null);
  const [isTogglingActive, startToggleTransition] = useTransition();

  // Create a map of category ID to category object for fast lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, CategoryItem>();
    categories.forEach((cat) => {
      map.set(cat.id, cat);
    });
    return map;
  }, [categories]);

  // Sync selectedUser with latest users state when updated
  const activeSelectedUser = useMemo(() => {
    if (!selectedUser) return null;
    return users.find((u) => u.id === selectedUser.id) ?? selectedUser;
  }, [users, selectedUser]);

  // Refresh user list from server action
  const reloadUsers = async () => {
    const res = await fetchUsers();
    if (res.success && res.users) {
      setUsers(res.users);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // 1. Search Query (Name, Email, Department, Phone)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchEmail = user.email.toLowerCase().includes(query);
        const matchName = user.displayName?.toLowerCase().includes(query) ?? false;
        const matchDept = user.department?.toLowerCase().includes(query) ?? false;
        const matchPhone = user.phone?.toLowerCase().includes(query) ?? false;
        if (!matchEmail && !matchName && !matchDept && !matchPhone) return false;
      }

      // 2. Status Filter (active / inactive / all)
      if (statusFilter === "active" && !user.isActive) return false;
      if (statusFilter === "inactive" && user.isActive) return false;

      // 3. Role Filter
      if (roleFilter !== "all") {
        if (roleFilter === "admin" && user.role !== "admin") return false;
        if (roleFilter === "technician" && user.role !== "technician") return false;
        if (roleFilter === "user" && user.role !== null) return false;
      }

      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    let adminCount = 0;
    let techCount = 0;
    let activeCount = 0;
    let inactiveCount = 0;

    users.forEach((u) => {
      if (u.isActive) activeCount++;
      else inactiveCount++;

      if (u.role === "admin") adminCount++;
      else if (u.role === "technician") techCount++;
    });

    return { total: users.length, activeCount, inactiveCount, adminCount, techCount };
  }, [users]);

  // Handlers
  const handleViewProfile = (user: UserItem) => {
    setSelectedUser(user);
    setProfileSheetOpen(true);
  };

  const handleEditClick = (user: UserItem) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleResetPasswordClick = (user: UserItem) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  };

  const handleCategoryClick = (user: UserItem) => {
    setSelectedTechUser(user);
    setTechCategoryDialogOpen(true);
  };

  const handleToggleActiveClick = (user: UserItem) => {
    setConfirmToggleUser(user);
  };

  const handleConfirmToggleActive = () => {
    if (!confirmToggleUser) return;
    const target = confirmToggleUser;
    const nextStatus = !target.isActive;

    startToggleTransition(async () => {
      const res = await toggleUserActive(target.id, nextStatus);
      if (res.success) {
        toast.success(nextStatus ? `已重新啟用 ${target.email}` : `已停用 ${target.email}`);
        setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, isActive: nextStatus } : u)));
        setConfirmToggleUser(null);
      } else {
        toast.error(res.error ?? "更新啟用狀態失敗");
      }
    });
  };

  const handleUserSubmit = async (
    userId: string,
    data: {
      displayName: string;
      role: "admin" | "technician" | null;
      department?: string | null;
      phone?: string | null;
    },
  ) => {
    const res = await updateUserProfile(userId, data);
    if (res.success) {
      toast.success("已更新使用者個人檔案與權限");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                displayName: data.displayName.trim() || null,
                role: data.role,
                department: data.department ?? null,
                phone: data.phone ?? null,
              }
            : u,
        ),
      );
    }
    return res;
  };

  const handleCreatedSuccess = (email: string, password: string) => {
    setCreateSuccessData({ email, password });
    void reloadUsers();
  };

  const handleTechCategorySuccess = (technicianId: string, updatedCategoryIds: string[]) => {
    toast.success("已更新技師負責報修類別");
    setTechnicianCategoryMap((prev) => ({
      ...prev,
      [technicianId]: updatedCategoryIds,
    }));
  };

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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">帳號總數</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.total}</div>
            <p className="text-muted-foreground text-xs">系統中註冊的帳號總和</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">正常啟用中</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-emerald-600 dark:text-emerald-400">{stats.activeCount}</div>
            <p className="text-muted-foreground text-xs">可正常登入使用系統之帳號</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">維修技師</CardTitle>
            <Wrench className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-blue-600 dark:text-blue-400">{stats.techCount}</div>
            <p className="text-muted-foreground text-xs">可指派或接領工單之維修人員</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">已停用帳號</CardTitle>
            <UserX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-destructive">{stats.inactiveCount}</div>
            <p className="text-muted-foreground text-xs">已被停權無法登入之帳號</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-xs">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-semibold text-lg">使用者與權限管理</CardTitle>
            <CardDescription className="text-sm">
              管理系統帳號、指派權限角色（管理員、技師或一般使用者）、設定技師負責類別與帳號啟用狀態。
            </CardDescription>
          </div>

          <Button onClick={() => setCreateDialogOpen(true)} className="shrink-0">
            <UserPlus className="mr-2 h-4 w-4" />
            新增使用者
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋姓名、Email、部門或電話..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="w-full sm:w-[150px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="帳號狀態" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">僅啟用中</SelectItem>
                    <SelectItem value="inactive">僅已停用</SelectItem>
                    <SelectItem value="all">全部狀態</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-[170px]">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="篩選角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有角色</SelectItem>
                    <SelectItem value="admin">系統管理者 (Admin)</SelectItem>
                    <SelectItem value="technician">維修技師 (Technician)</SelectItem>
                    <SelectItem value="user">一般使用者 (User)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>使用者姓名 / Email</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>權限角色</TableHead>
                  <TableHead className="hidden lg:table-cell">負責報修類別</TableHead>
                  <TableHead className="hidden md:table-cell">建立日期</TableHead>
                  <TableHead className="hidden sm:table-cell">最後登入</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      {searchQuery || roleFilter !== "all" || statusFilter !== "active"
                        ? "找不到符合篩選條件的使用者"
                        : "目前系統中無使用者資料"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const isTech = user.role === "technician";
                    const subscribedIds = isTech ? (technicianCategoryMap[user.id] ?? []) : [];
                    const subscribedCategories = subscribedIds
                      .map((id) => categoryMap.get(id))
                      .filter((c): c is CategoryItem => Boolean(c));

                    return (
                      <TableRow key={user.id} className={!user.isActive ? "bg-muted/30 opacity-75" : undefined}>
                        <TableCell>
                          <button
                            type="button"
                            className="group flex cursor-pointer flex-col rounded-xs text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            onClick={() => handleViewProfile(user)}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                                {user.displayName || "（未設定姓名）"}
                              </span>
                              {user.department && (
                                <span className="rounded bg-muted px-1.5 py-0.2 text-[11px] text-muted-foreground">
                                  {user.department}
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-muted-foreground text-xs">{user.email}</span>
                          </button>
                        </TableCell>
                        <TableCell>
                          {user.isActive ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-normal text-emerald-700 text-xs dark:text-emerald-400"
                            >
                              啟用中
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-destructive/20 bg-destructive/10 px-2 py-0.5 font-normal text-destructive text-xs"
                            >
                              已停用
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <UserRoleBadge role={user.role} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {!isTech && <span className="text-muted-foreground text-xs">—</span>}
                          {isTech && subscribedCategories.length === 0 && (
                            <span className="text-amber-600 text-xs italic dark:text-amber-400">未設定類別</span>
                          )}
                          {isTech && subscribedCategories.length > 0 && (
                            <div className="flex max-w-[240px] flex-wrap gap-1">
                              {subscribedCategories.map((cat) => (
                                <Badge
                                  key={cat.id}
                                  variant="secondary"
                                  className="border-blue-200 bg-blue-500/10 px-2 py-0.5 font-normal text-[11px] text-blue-700 dark:border-blue-800/40 dark:text-blue-300"
                                >
                                  {cat.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground text-xs md:table-cell">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground text-xs sm:table-cell">
                          {formatDate(user.lastSignInAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleViewProfile(user)}
                              title="查看使用者詳細檔案與統計"
                            >
                              <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              <span className="sr-only">詳細資料</span>
                            </Button>
                            {isTech && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleCategoryClick(user)}
                                title="設定負責報修類別"
                                className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/40"
                              >
                                <Tag className="h-4 w-4" />
                                <span className="sr-only">類別設定</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleEditClick(user)}
                              title="編輯使用者資料與角色"
                            >
                              <Edit2 className="h-4 w-4" />
                              <span className="sr-only">編輯</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleResetPasswordClick(user)}
                              title="重設登入密碼"
                            >
                              <KeyRound className="h-4 w-4" />
                              <span className="sr-only">重設密碼</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleToggleActiveClick(user)}
                              title={user.isActive ? "停用此帳號" : "啟用此帳號"}
                              className={
                                user.isActive
                                  ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                              }
                            >
                              {user.isActive ? <Ban className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                              <span className="sr-only">{user.isActive ? "停用" : "啟用"}</span>
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

      {/* User Create Dialog */}
      <UserCreateDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onCreated={handleCreatedSuccess} />

      {/* User Create Success Dialog */}
      {createSuccessData && (
        <UserCreateSuccessDialog
          open={Boolean(createSuccessData)}
          onOpenChange={(open) => {
            if (!open) setCreateSuccessData(null);
          }}
          email={createSuccessData.email}
          password={createSuccessData.password}
        />
      )}

      {/* User Profile Sheet */}
      <UserProfileSheet
        open={profileSheetOpen}
        onOpenChange={setProfileSheetOpen}
        user={activeSelectedUser}
        categories={categories}
        technicianCategoryIds={activeSelectedUser ? (technicianCategoryMap[activeSelectedUser.id] ?? []) : []}
        onEdit={(u) => {
          setProfileSheetOpen(false);
          handleEditClick(u);
        }}
        onResetPassword={(u) => {
          setProfileSheetOpen(false);
          handleResetPasswordClick(u);
        }}
        onToggleActive={(u) => {
          setProfileSheetOpen(false);
          handleToggleActiveClick(u);
        }}
        onManageCategories={(u) => {
          setProfileSheetOpen(false);
          handleCategoryClick(u);
        }}
      />

      {/* Edit User Dialog */}
      <UserEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={activeSelectedUser}
        onSubmit={handleUserSubmit}
      />

      {/* Reset Password Dialog */}
      <UserResetPasswordDialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
        user={activeSelectedUser}
      />

      {/* Technician Category Subscription Dialog */}
      <TechnicianCategoryDialog
        open={techCategoryDialogOpen}
        onOpenChange={setTechCategoryDialogOpen}
        user={selectedTechUser}
        categories={categories}
        onSuccess={handleTechCategorySuccess}
      />

      {/* Toggle Active Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(confirmToggleUser)}
        onOpenChange={(open) => {
          if (!open) setConfirmToggleUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggleUser?.isActive ? "確認停用此使用者帳號？" : "確認重新啟用此使用者帳號？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggleUser?.isActive ? (
                <>
                  您即將停用帳號 <strong className="font-mono text-foreground">{confirmToggleUser?.email}</strong>
                  。停用後該使用者將無法登入系統，但既有報修單與歷史紀錄將予以完整保留。
                </>
              ) : (
                <>
                  您即將重新啟用帳號 <strong className="font-mono text-foreground">{confirmToggleUser?.email}</strong>
                  。啟用後該使用者將可立即恢復登入並存取系統功能。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTogglingActive}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmToggleUser?.isActive ? "destructive" : "default"}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmToggleActive();
              }}
              disabled={isTogglingActive}
            >
              {isTogglingActive && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmToggleUser?.isActive ? "確認停用" : "確認啟用"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
