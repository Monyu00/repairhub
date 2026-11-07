import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { MyProfile } from "../_actions/profile-actions";

function getRoleLabel(role: MyProfile["role"]) {
  if (role === "admin") return "系統管理員 (Admin)";
  if (role === "technician") return "維修技師 (Technician)";
  return "一般使用者";
}

interface CurrentLoginInfoCardProps {
  profile: MyProfile;
}

export function CurrentLoginInfoCard({ profile }: CurrentLoginInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>目前登入資訊</CardTitle>
        <CardDescription>以下資訊由系統管理員維護，無法在此變更。</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex flex-wrap items-center justify-between gap-1 rounded-lg border border-border bg-muted/20 p-3">
            <dt className="text-muted-foreground">電子郵件</dt>
            <dd className="font-medium break-all text-foreground">{profile.email}</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 rounded-lg border border-border bg-muted/20 p-3">
            <dt className="text-muted-foreground">角色</dt>
            <dd className="font-medium text-foreground">{getRoleLabel(profile.role)}</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 rounded-lg border border-border bg-muted/20 p-3">
            <dt className="text-muted-foreground">帳號是否啟用</dt>
            <dd className="font-medium text-foreground">{profile.isActive ? "已啟用" : "已停用"}</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 rounded-lg border border-border bg-muted/20 p-3">
            <dt className="text-muted-foreground">是否需變更密碼</dt>
            <dd className="font-medium text-foreground">{profile.mustChangePassword ? "是" : "否"}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
