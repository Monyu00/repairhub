import { BuildingIcon, FileTextIcon, TagIcon, WrenchIcon } from "lucide-react";

import { Separator } from "@/components/ui/separator";

interface TicketDetailsProps {
  category: string;
  building: string;
  space: string;
  description: string;
  equipment?: string | null;
}

interface DetailRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function DetailRow({ icon: Icon, label, value }: DetailRowProps) {
  return (
    <div className="flex gap-3 items-start">
      <div className="mt-0.5 shrink-0 flex size-7 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

export function TicketDetails({ category, building, space, description, equipment }: TicketDetailsProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">報修資訊</h2>
      <div className="space-y-3">
        <DetailRow icon={TagIcon} label="報修類別" value={category} />
        <Separator />
        <DetailRow icon={BuildingIcon} label="地點" value={`${building} - ${space}`} />
        {equipment && (
          <>
            <Separator />
            <DetailRow icon={WrenchIcon} label="設備" value={equipment} />
          </>
        )}
        <Separator />
        <DetailRow icon={FileTextIcon} label="問題描述" value={description} />
      </div>
    </div>
  );
}
