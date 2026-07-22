import type { ReactNode } from "react";

import { WrenchIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

export default function ReportLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4 sm:py-12">
      <div className="mx-auto max-w-xl">
        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <WrenchIcon className="size-5" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">RepairHub</span>
        </div>

        {/* Main Card */}
        <Card className="border border-border bg-card p-6 shadow-sm sm:p-8">{children}</Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} RepairHub. All rights reserved.
        </div>
      </div>
    </div>
  );
}
