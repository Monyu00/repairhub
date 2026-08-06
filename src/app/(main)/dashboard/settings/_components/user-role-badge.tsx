import { ShieldCheck, User, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type UserRole = "admin" | "technician" | null;

interface UserRoleBadgeProps {
  role: UserRole;
  className?: string;
}

export function UserRoleBadge({ role, className }: UserRoleBadgeProps) {
  if (role === "admin") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1.5 font-normal px-2.5 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
          className,
        )}
      >
        <ShieldCheck className="size-3.5 shrink-0" />
        <span>系統管理者</span>
      </Badge>
    );
  }

  if (role === "technician") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1.5 font-normal px-2.5 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
          className,
        )}
      >
        <Wrench className="size-3.5 shrink-0" />
        <span>維修技師</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-normal px-2.5 py-0.5 bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
        className,
      )}
    >
      <User className="size-3.5 shrink-0" />
      <span>一般使用者</span>
    </Badge>
  );
}
