import { type LucideIcon, ShieldCheck, User, Wrench } from "lucide-react";

type UserRoleOptionValue = "user" | "technician" | "admin";

const ROLE_OPTIONS: Record<UserRoleOptionValue, { label: string; icon: LucideIcon; iconClassName: string }> = {
  user: { label: "一般使用者", icon: User, iconClassName: "text-muted-foreground" },
  technician: { label: "維修技師", icon: Wrench, iconClassName: "text-info-text" },
  admin: { label: "系統管理者", icon: ShieldCheck, iconClassName: "text-destructive" },
};

export function UserRoleOption({ userRole }: { userRole: UserRoleOptionValue }) {
  const { label, icon: Icon, iconClassName } = ROLE_OPTIONS[userRole];

  return (
    <div className="flex items-center gap-2">
      <Icon aria-hidden="true" className={`size-4 ${iconClassName}`} />
      <span>{label}</span>
    </div>
  );
}
