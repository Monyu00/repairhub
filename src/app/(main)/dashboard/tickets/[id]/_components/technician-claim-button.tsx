"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Hand, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { claimTicket } from "../_actions/ticket-actions";

interface TechnicianClaimButtonProps {
  ticketId: string;
  status: string;
  isAssignedToMe?: boolean;
}

export function TechnicianClaimButton({ ticketId, status, isAssignedToMe }: TechnicianClaimButtonProps) {
  const router = useRouter();
  const [isClaiming, setIsClaiming] = useState(false);

  const isPending = status === "pending";

  const handleClaim = async () => {
    if (!isPending || isClaiming) return;

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

  const getDisabledReason = () => {
    if (isPending) return "";
    if (status === "in_progress") {
      return isAssignedToMe ? "您已接此單據（維修中）" : "此案件已被其他技師接單處理中";
    }
    if (status === "completed") return "此案件維修已完工";
    if (status === "closed") return "此案件已結案";
    if (status === "cancelled") return "此案件已取消";
    return "此案件目前狀態無法接單";
  };

  const claimButton = (
    <Button
      size="sm"
      variant={isPending ? "default" : "secondary"}
      disabled={!isPending || isClaiming}
      onClick={handleClaim}
      className="gap-1.5 text-xs shadow-xs"
    >
      {isClaiming ? <Loader2 className="size-3.5 animate-spin" /> : <Hand className="size-3.5" />}
      <span>{isPending ? (isClaiming ? "接單中..." : "立即接單") : "已不可接單"}</span>
    </Button>
  );

  if (!isPending) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block cursor-not-allowed">{claimButton}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{getDisabledReason()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return claimButton;
}
