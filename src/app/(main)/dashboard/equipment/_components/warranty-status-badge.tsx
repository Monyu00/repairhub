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
      <Badge variant="outline" className={cn("font-normal text-muted-foreground", className)}>
        未設定
      </Badge>
    );
  }

  if (status === "active") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1 font-normal bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
          className,
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-emerald-500" />
        <span>保固中</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-normal bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-amber-500" />
      <span>已過期</span>
    </Badge>
  );
}
