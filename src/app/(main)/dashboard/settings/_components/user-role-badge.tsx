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
          "gap-1.5 border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 font-normal text-rose-700 dark:text-rose-400",
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
          "gap-1.5 border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 font-normal text-blue-700 dark:text-blue-400",
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
        "gap-1.5 border-slate-500/20 bg-slate-500/10 px-2.5 py-0.5 font-normal text-slate-700 dark:text-slate-400",
        className,
      )}
    >
      <User className="size-3.5 shrink-0" />
      <span>一般使用者</span>
    </Badge>
  );
}
