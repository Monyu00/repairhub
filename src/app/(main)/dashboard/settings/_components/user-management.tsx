"use client";

import { useMemo, useState } from "react";

import { Edit2, Search, ShieldCheck, UserCheck, Users, Wrench } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { type UserItem, updateUserProfile } from "../_actions/user-actions";
import { UserEditDialog } from "./user-edit-dialog";

interface UserManagementProps {
  initialUsers: UserItem[];
}

export function UserManagement({ initialUsers }: UserManagementProps) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Sync state if server props change
  if (initialUsers !== users) {
    setUsers(initialUsers);
  }

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // 1. Search Query (Name or Email)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchEmail = user.email.toLowerCase().includes(query);
        const matchName = user.displayName?.toLowerCase().includes(query) ?? false;
        if (!matchEmail && !matchName) return false;
      }

      // 2. Role Filter
      if (roleFilter !== "all") {
        if (roleFilter === "admin" && user.role !== "admin") return false;
        if (roleFilter === "technician" && user.role !== "technician") return false;
        if (roleFilter === "user" && user.role !== null) return false;
      }

      return true;
    });
  }, [users, searchQuery, roleFilter]);

  // Statistics
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

  const handleEditClick = (user: UserItem) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleUserSubmit = async (
    userId: string,
    data: { displayName: string; role: "admin" | "technician" | null },
  ) => {
    const res = await updateUserProfile(userId, data);
    if (res.success) {
      toast.success("已更新使用者權限與個人檔案");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, displayName: data.displayName || null, role: data.role } : u)),
      );
    }
    return res;
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
            <CardTitle className="text-sm font-medium text-muted-foreground">帳號總數</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">已註冊使用者的帳號總和</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">系統管理者</CardTitle>
            <ShieldCheck className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.adminCount}</div>
            <p className="text-xs text-muted-foreground">擁有完整設定與派單權限</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">維修技師</CardTitle>
            <Wrench className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.techCount}</div>
            <p className="text-xs text-muted-foreground">可被指派工單並進行維修簽核</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">一般使用者</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userCount}</div>
            <p className="text-xs text-muted-foreground">可進行問題通報與維修進度查詢</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-xs">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">使用者與權限管理</CardTitle>
            <CardDescription className="text-sm">
              對系統使用者指派角色（管理員、維修技師或一般使用者）並設定顯示名稱。
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋姓名或 Email..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[180px]">
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

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>使用者姓名 / Email</TableHead>
                  <TableHead>權限角色</TableHead>
                  <TableHead className="hidden md:table-cell">建立日期</TableHead>
                  <TableHead className="hidden sm:table-cell">最後登入</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      {searchQuery || roleFilter !== "all" ? "找不到符合條件的使用者" : "目前系統中無使用者資料"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{user.displayName || "（未設定姓名）"}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role === "admin" && (
                          <Badge variant="destructive" className="gap-1 font-normal">
                            <ShieldCheck className="h-3 w-3" />
                            系統管理者
                          </Badge>
                        )}
                        {user.role === "technician" && (
                          <Badge
                            variant="default"
                            className="gap-1 bg-blue-600 font-normal hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                          >
                            <Wrench className="h-3 w-3" />
                            維修技師
                          </Badge>
                        )}
                        {user.role === null && (
                          <Badge variant="outline" className="font-normal text-muted-foreground">
                            一般使用者
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                        {formatDate(user.lastSignInAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEditClick(user)}
                          title="編輯使用者角色與名稱"
                        >
                          <Edit2 className="h-4 w-4" />
                          <span className="sr-only">編輯</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <UserEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onSubmit={handleUserSubmit}
      />
    </div>
  );
}
