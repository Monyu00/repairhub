"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Hand, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TicketDetailActionCapability } from "@/server/tickets/capabilities";

import { claimTicket } from "../_actions/ticket-actions";

interface TechnicianClaimButtonProps {
  ticketId: string;
  capability: TicketDetailActionCapability;
}

export function TechnicianClaimButton({ ticketId, capability }: TechnicianClaimButtonProps) {
  const router = useRouter();
  const [isClaiming, setIsClaiming] = useState(false);
  const { enabled, disabledReason } = capability;

  const handleClaim = async () => {
    if (!enabled || isClaiming) return;

    setIsClaiming(true);
    try {
      const res = await claimTicket(ticketId);
      if (res.success) {
        toast.success("接單成功，案件已轉為維修中");
        router.refresh();
      } else {
        toast.error(res.error ?? "接單失敗或已被其他技師接單");
      }
    } catch (err) {
      console.error("Failed to claim ticket:", err);
      toast.error("接單時發生網路錯誤，請稍後再試");
    } finally {
      setIsClaiming(false);
    }
  };

  const claimButton = (
    <Button
      size="sm"
      variant={enabled ? "default" : "secondary"}
      disabled={!enabled || isClaiming}
      onClick={handleClaim}
      className="gap-1.5 text-xs shadow-xs"
    >
      {isClaiming ? <Loader2 className="size-3.5 animate-spin" /> : <Hand className="size-3.5" />}
      <span>
        {enabled && (isClaiming ? "接單中..." : "立即接單")}
        {!enabled && "已不可接單"}
      </span>
    </Button>
  );

  if (!enabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block cursor-not-allowed">{claimButton}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{disabledReason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return claimButton;
}
