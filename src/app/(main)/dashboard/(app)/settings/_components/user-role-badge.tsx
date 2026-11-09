import { ShieldCheck, User, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/lib/users/projection";
import { cn } from "@/lib/utils";

interface UserRoleBadgeProps {
  role: UserRole | null;
  className?: string;
}

export function UserRoleBadge({ role, className }: UserRoleBadgeProps) {
  if (role === "admin") {
    return (
      <Badge variant="destructive" className={cn("gap-1.5", className)}>
        <ShieldCheck aria-hidden="true" className="shrink-0" />
        <span>系統管理者</span>
      </Badge>
    );
  }

  if (role === "technician") {
    return (
      <Badge variant="info" className={cn("gap-1.5", className)}>
        <Wrench aria-hidden="true" className="shrink-0" />
        <span>維修技師</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn("gap-1.5", className)}>
      <User aria-hidden="true" className="shrink-0" />
      <span>一般使用者</span>
    </Badge>
  );
}
