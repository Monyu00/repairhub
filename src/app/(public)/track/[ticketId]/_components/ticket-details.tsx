import { BuildingIcon, FileTextIcon, TagIcon, WrenchIcon } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { formatTicketLocation, type TicketRecord } from "@/server/tickets/query";

interface TicketDetailsProps {
  ticket: TicketRecord;
}

interface DetailRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function DetailRow({ icon: Icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="mb-0.5 text-muted-foreground text-xs">{label}</p>
        <p className="break-words font-medium text-foreground text-sm">{value}</p>
      </div>
    </div>
  );
}

export function TicketDetails({ ticket }: TicketDetailsProps) {
  const { category, description, equipmentName } = ticket;

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-foreground text-sm">報修資訊</h2>
      <div className="space-y-3">
        <DetailRow icon={TagIcon} label="報修類別" value={category.name} />
        <Separator />
        <DetailRow icon={BuildingIcon} label="地點" value={formatTicketLocation(ticket)} />
        {equipmentName && (
          <>
            <Separator />
            <DetailRow icon={WrenchIcon} label="設備" value={equipmentName} />
          </>
        )}
        <Separator />
        <DetailRow icon={FileTextIcon} label="問題描述" value={description} />
      </div>
    </div>
  );
}
