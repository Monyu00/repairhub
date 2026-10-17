import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_COLUMNS = [0, 1, 2, 3, 4, 5];
const SKELETON_ROWS = [0, 1, 2, 3, 4];
const MOBILE_CARDS = [0, 1, 2];

export function TicketsLoadingSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="正在載入報修單資料">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card/60 p-3.5 shadow-xs backdrop-blur-xs">
        <Skeleton className="h-8 w-full sm:w-56 md:w-64" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="hidden overflow-hidden rounded-xl border bg-card/70 shadow-2xs md:block">
        <div className="grid grid-cols-6 gap-4 border-b bg-muted/40 px-4 py-3">
          {SKELETON_COLUMNS.map((column) => (
            <Skeleton key={`header-${column}`} className="h-4 w-full" />
          ))}
        </div>
        {SKELETON_ROWS.map((row) => (
          <div key={row} className="grid grid-cols-6 gap-4 border-b px-4 py-4 last:border-b-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-5 w-16 rounded-4xl" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:hidden">
        {MOBILE_CARDS.map((card) => (
          <Card key={card} className="shadow-2xs">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2 border-border/50 border-b pb-2.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-16 rounded-4xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="flex items-center justify-between gap-2 border-border/40 border-t pt-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-52" />
      </div>
    </div>
  );
}
