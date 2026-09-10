import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

export default function ReportLayout({ children }: { children: ReactNode }) {
  return (
    <div className="py-6 sm:py-10">
      <div className="mx-auto max-w-xl">
        <Card className="border border-border bg-card p-6 shadow-sm sm:p-8">{children}</Card>
      </div>
    </div>
  );
}
