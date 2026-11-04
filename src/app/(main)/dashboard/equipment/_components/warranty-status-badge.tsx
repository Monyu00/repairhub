import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type WarrantyStatus = "none" | "active" | "expired";

export function getWarrantyStatus(warrantyExpiry: string | null | undefined): WarrantyStatus {
  if (!warrantyExpiry) return "none";

  const todayStr = new Date().toISOString().split("T")[0];
  return todayStr <= warrantyExpiry ? "active" : "expired";
}

interface WarrantyStatusBadgeProps {
  warrantyExpiry: string | null | undefined;
  className?: string;
}

export function WarrantyStatusBadge({ warrantyExpiry, className }: WarrantyStatusBadgeProps) {
  const status = getWarrantyStatus(warrantyExpiry);

  if (status === "none") {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        未設定
      </Badge>
    );
  }

  if (status === "active") {
    return (
      <Badge variant="success" className={cn("gap-1", className)}>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
        <span>保固中</span>
      </Badge>
    );
  }

  return (
    <Badge variant="warning" className={cn("gap-1", className)}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
      <span>已過期</span>
    </Badge>
  );
}
