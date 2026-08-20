import type { ReactNode } from "react";

import { WrenchIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { APP_CONFIG } from "@/config/app-config";

export default function ReportLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-6 sm:py-12">
      <div className="mx-auto max-w-xl">
        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <WrenchIcon className="size-5" />
          </div>
          <span className="font-bold font-heading text-foreground text-lg tracking-tight">RepairHub</span>
        </div>

        {/* Main Card */}
        <Card className="border border-border bg-card p-6 shadow-sm sm:p-8">{children}</Card>

        {/* Footer */}
        <div className="mt-8 text-center text-muted-foreground text-xs">{APP_CONFIG.copyright}</div>
      </div>
    </div>
  );
}
