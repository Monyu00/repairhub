"use client";

import { useMemo, useState, useTransition } from "react";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit2,
  Eye,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Power,
  RotateCcw,
  Search,
  ShieldCheck,
  Tag,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
  X,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { CategoryItem } from "../_actions/category-actions";
import {
  batchToggleUserActive,
  fetchUsers,
  toggleUserActive,
  type UserItem,
  updateUserProfile,
} from "../_actions/user-actions";
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

type SortField = "name" | "status" | "role" | "createdAt" | "lastSignInAt";
type SortDirection = "asc" | "desc";

export function UserManagement({ initialUsers, categories, initialTechnicianCategoryMap = {} }: UserManagementProps) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [technicianCategoryMap, setTechnicianCategoryMap] =
    useState<Record<string, string[]>>(initialTechnicianCategoryMap);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active"); // default: 'active'

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
  const [confirmBatchToggleAction, setConfirmBatchToggleAction] = useState<boolean | null>(null);
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

  // Filtered & Sorted users
  const filteredUsers = useMemo(() => {
    const filtered = users.filter((user) => {
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

    // Sort
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name": {
          const nameA = (a.displayName ?? a.email).toLowerCase();
          const nameB = (b.displayName ?? b.email).toLowerCase();
          comparison = nameA.localeCompare(nameB, "zh-Hant");
          break;
        }
        case "status": {
          comparison = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
          break;
        }
        case "role": {
          const getRoleScore = (r: UserItem["role"]) => {
            if (r === "admin") return 0;
            if (r === "technician") return 1;
            return 2;
          };
          comparison = getRoleScore(a.role) - getRoleScore(b.role);
          break;
        }
        case "createdAt": {
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        }
        case "lastSignInAt": {
          const timeA = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0;
          const timeB = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0;
          comparison = timeA - timeB;
          break;
        }
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [users, searchQuery, roleFilter, statusFilter, sortField, sortDirection]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  // Statistics: Total, Admin, Technician, User
  const stats = useMemo(() => {
    let adminCount = 0;
    let techCount = 0;
    let userCount = 0;

    users.forEach((u) => {
      if (u.role === "admin") adminCount++;
      else if (u.role === "technician") techCount++;
      else userCount++;
    });

    return { total: users.length, adminCount, techCount, userCount };
  }, [users]);

  // Checkbox Selection Logic
  const allCurrentPageSelected = paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedIds.has(u.id));
  const someCurrentPageSelected = paginatedUsers.some((u) => selectedIds.has(u.id)) && !allCurrentPageSelected;

  const selectAllCheckedState = useMemo(() => {
    if (allCurrentPageSelected) return true;
    if (someCurrentPageSelected) return "indeterminate";
    return false;
  }, [allCurrentPageSelected, someCurrentPageSelected]);

  const handleSelectAllCurrentPage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const u of paginatedUsers) {
          next.add(u.id);
        }
      } else {
        for (const u of paginatedUsers) {
          next.delete(u.id);
        }
      }
      return next;
    });
  };

  const handleSelectRow = (userId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Sorting Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getAriaSort = (field: SortField): "none" | "ascending" | "descending" => {
    if (sortField !== field) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5 text-foreground" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5 text-foreground" />
    );
  };

  // Action Handlers
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

  const handleBatchToggleClick = (targetActive: boolean) => {
    if (selectedIds.size === 0) return;
    setConfirmBatchToggleAction(targetActive);
  };

  const handleConfirmBatchToggle = () => {
    if (confirmBatchToggleAction === null || selectedIds.size === 0) return;
    const targetActive = confirmBatchToggleAction;
    const idsArray = Array.from(selectedIds);

    startToggleTransition(async () => {
      const res = await batchToggleUserActive(idsArray, targetActive);
      if (res.success) {
        toast.success(
          targetActive
            ? `已批次啟用 ${res.modifiedCount ?? idsArray.length} 位使用者`
            : `已批次停用 ${res.modifiedCount ?? idsArray.length} 位使用者`,
        );
        setUsers((prev) => prev.map((u) => (selectedIds.has(u.id) ? { ...u, isActive: targetActive } : u)));
        setSelectedIds(new Set());
        setConfirmBatchToggleAction(null);
      } else {
        toast.error(res.error ?? "批次操作失敗");
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

  const handleResetFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setStatusFilter("active");
    setCurrentPage(1);
  };

  const isFiltersModified = searchQuery !== "" || roleFilter !== "all" || statusFilter !== "active";

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
      {/* 4 Summary Cards: 總數、管理員、維修技師、一般使用者 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">帳號總數</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.total}</div>
            <p className="text-muted-foreground text-xs">已註冊使用者的帳號總和</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">系統管理者</CardTitle>
            <ShieldCheck className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-destructive">{stats.adminCount}</div>
            <p className="text-muted-foreground text-xs">擁有完整設定與派單權限</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">維修技師</CardTitle>
            <Wrench className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-blue-600 dark:text-blue-400">{stats.techCount}</div>
            <p className="text-muted-foreground text-xs">可被指派工單並進行維修簽核</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">一般使用者</CardTitle>
            <UserCheck className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-foreground">{stats.userCount}</div>
            <p className="text-muted-foreground text-xs">可進行問題通報與進度查詢</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-xs">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-semibold text-lg">使用者與權限管理</CardTitle>
            <CardDescription className="text-sm">
              管理系統帳號、指派權限角色、設定技師負責類別與帳號啟用狀態。
            </CardDescription>
          </div>

          <Button onClick={() => setCreateDialogOpen(true)} className="shrink-0">
            <UserPlus className="mr-2 h-4 w-4" />
            新增使用者
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters Bar: 搜尋框 + 狀態篩選 + 角色篩選 對齊設計 */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋姓名、Email、部門或電話..."
                className="h-9 pl-9"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-[150px]">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9">
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
                <Select
                  value={roleFilter}
                  onValueChange={(val) => {
                    setRoleFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9">
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

              {isFiltersModified && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 px-2.5 text-muted-foreground hover:text-foreground"
                  title="重設篩選條件"
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  重設
                </Button>
              )}
            </div>
          </div>

          {/* Batch Selection Action Bar (when items are selected) */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-2 py-0.5 font-semibold">
                  已選取 {selectedIds.size} 位使用者
                </Badge>
                <span className="text-muted-foreground text-xs">（跨頁選取）</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-emerald-600 text-xs hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                  onClick={() => handleBatchToggleClick(true)}
                >
                  <Power className="mr-1.5 h-3.5 w-3.5" />
                  批次啟用
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleBatchToggleClick(false)}
                >
                  <Ban className="mr-1.5 h-3.5 w-3.5" />
                  批次停用
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-muted-foreground text-xs hover:text-foreground"
                  onClick={handleClearSelection}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  取消選取
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px] text-center">
                    <Checkbox
                      checked={selectAllCheckedState}
                      onCheckedChange={(checked) => handleSelectAllCurrentPage(checked === true)}
                      aria-label="選取目前頁面所有使用者"
                    />
                  </TableHead>
                  <TableHead aria-sort={getAriaSort("name")}>
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center font-medium text-foreground transition-colors hover:text-primary"
                      onClick={() => handleSort("name")}
                    >
                      使用者姓名 / Email
                      {renderSortIcon("name")}
                    </button>
                  </TableHead>
                  <TableHead aria-sort={getAriaSort("status")}>
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center font-medium text-foreground transition-colors hover:text-primary"
                      onClick={() => handleSort("status")}
                    >
                      狀態
                      {renderSortIcon("status")}
                    </button>
                  </TableHead>
                  <TableHead aria-sort={getAriaSort("role")}>
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center font-medium text-foreground transition-colors hover:text-primary"
                      onClick={() => handleSort("role")}
                    >
                      權限角色
                      {renderSortIcon("role")}
                    </button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">負責報修類別</TableHead>
                  <TableHead className="hidden md:table-cell" aria-sort={getAriaSort("createdAt")}>
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center font-medium text-foreground transition-colors hover:text-primary"
                      onClick={() => handleSort("createdAt")}
                    >
                      建立日期
                      {renderSortIcon("createdAt")}
                    </button>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell" aria-sort={getAriaSort("lastSignInAt")}>
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center font-medium text-foreground transition-colors hover:text-primary"
                      onClick={() => handleSort("lastSignInAt")}
                    >
                      最後登入
                      {renderSortIcon("lastSignInAt")}
                    </button>
                  </TableHead>
                  <TableHead className="w-[60px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      {searchQuery || roleFilter !== "all" || statusFilter !== "active"
                        ? "找不到符合篩選條件的使用者"
                        : "目前系統中無使用者資料"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => {
                    const isTech = user.role === "technician";
                    const isSelected = selectedIds.has(user.id);
                    const subscribedIds = isTech ? (technicianCategoryMap[user.id] ?? []) : [];
                    const subscribedCategories = subscribedIds
                      .map((id) => categoryMap.get(id))
                      .filter((c): c is CategoryItem => Boolean(c));

                    return (
                      <TableRow
                        key={user.id}
                        data-state={isSelected ? "selected" : undefined}
                        className={!user.isActive ? "bg-muted/30 opacity-75" : undefined}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectRow(user.id, checked === true)}
                            aria-label={`選取 ${user.displayName ?? user.email}`}
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="group flex cursor-pointer flex-col rounded-xs text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            onClick={() => handleViewProfile(user)}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                                {user.displayName ?? "（未設定姓名）"}
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
                          {/* Meatballs dropdown action menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" className="h-8 w-8 p-0" title="操作選項">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">開啟操作選單</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleViewProfile(user)}>
                                <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                                查看詳細檔案
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditClick(user)}>
                                <Edit2 className="mr-2 h-4 w-4 text-muted-foreground" />
                                編輯基本資料
                              </DropdownMenuItem>
                              {isTech && (
                                <DropdownMenuItem onClick={() => handleCategoryClick(user)}>
                                  <Tag className="mr-2 h-4 w-4 text-blue-500" />
                                  設定負責類別
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleResetPasswordClick(user)}>
                                <KeyRound className="mr-2 h-4 w-4 text-muted-foreground" />
                                重設登入密碼
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleActiveClick(user)}
                                className={
                                  user.isActive
                                    ? "text-destructive focus:text-destructive"
                                    : "text-emerald-600 focus:text-emerald-600 dark:text-emerald-400"
                                }
                              >
                                {user.isActive ? (
                                  <>
                                    <Ban className="mr-2 h-4 w-4" />
                                    停用此帳號
                                  </>
                                ) : (
                                  <>
                                    <Power className="mr-2 h-4 w-4" />
                                    啟用此帳號
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Bottom Pagination & Page Size Toolbar */}
          <div className="flex flex-col items-center justify-between gap-4 py-2 sm:flex-row">
            <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
              <span>
                顯示第 <strong className="text-foreground">{filteredUsers.length === 0 ? 0 : startIndex + 1}</strong> 至{" "}
                <strong className="text-foreground">{Math.min(startIndex + pageSize, filteredUsers.length)}</strong>{" "}
                筆，共 <strong className="text-foreground">{filteredUsers.length}</strong> 筆
              </span>

              <div className="flex items-center gap-1.5">
                <span>每頁顯示</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[72px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span>筆</span>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                className="h-8 w-8"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage <= 1}
                title="第一頁"
              >
                <ChevronsLeft className="h-4 w-4" />
                <span className="sr-only">第一頁</span>
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                title="上一頁"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">上一頁</span>
              </Button>

              <div className="flex items-center px-2 text-xs">
                <span className="font-medium text-foreground">
                  第 {safeCurrentPage} / {totalPages} 頁
                </span>
              </div>

              <Button
                variant="outline"
                size="icon-sm"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                title="下一頁"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">下一頁</span>
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                className="h-8 w-8"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage >= totalPages}
                title="最後一頁"
              >
                <ChevronsRight className="h-4 w-4" />
                <span className="sr-only">最後一頁</span>
              </Button>
            </div>
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

      {/* Single Toggle Active Confirmation Alert Dialog */}
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

      {/* Batch Toggle Active Confirmation Alert Dialog */}
      <AlertDialog
        open={confirmBatchToggleAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmBatchToggleAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmBatchToggleAction ? "確認批次啟用已選取的帳號？" : "確認批次停用已選取的帳號？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBatchToggleAction ? (
                <>
                  您即將批次啟用 <strong className="text-foreground">{selectedIds.size}</strong>{" "}
                  位使用者的帳號。啟用後這些使用者將可立即恢復登入。
                </>
              ) : (
                <>
                  您即將批次停用 <strong className="text-foreground">{selectedIds.size}</strong>{" "}
                  位使用者的帳號。停用後這些使用者將無法登入系統（系統將自動跳過您自己的管理員帳號）。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTogglingActive}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmBatchToggleAction ? "default" : "destructive"}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmBatchToggle();
              }}
              disabled={isTogglingActive}
            >
              {isTogglingActive && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmBatchToggleAction ? "確認批次啟用" : "確認批次停用"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
