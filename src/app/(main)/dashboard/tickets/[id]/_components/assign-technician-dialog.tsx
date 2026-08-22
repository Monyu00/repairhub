"use client";

import { useEffect, useState } from "react";

import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { assignTicket, fetchTechnicians } from "../_actions/ticket-actions";

interface AssignTechnicianDialogProps {
  ticketId: string;
}

interface Technician {
  id: string;
  displayName: string;
}

export function AssignTechnicianDialog({ ticketId }: AssignTechnicianDialogProps) {
  const [open, setOpen] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>("");
  const [isLoadingTechs, setIsLoadingTechs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setIsLoadingTechs(true);

    fetchTechnicians()
      .then((res) => {
        if (isMounted) {
          if (res.success && res.technicians) {
            setTechnicians(res.technicians);
          } else {
            toast.error(res.error || "載入技師列表失敗");
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load technicians:", err);
        if (isMounted) {
          toast.error("載入技師列表時發生錯誤");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingTechs(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await assignTicket(ticketId, selectedTechId);
      if (result.success) {
        toast.success("已成功指派技師");
        setOpen(false);
        setSelectedTechId("");
      } else {
        toast.error(result.error ?? "指派技師失敗");
      }
    } catch (err) {
      console.error("Assign technician error:", err);
      toast.error("指派技師時發生網路錯誤");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSelectContent = () => {
    if (isLoadingTechs) {
      return (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground text-xs">載入技師列表...</span>
        </div>
      );
    }

    if (technicians.length === 0) {
      return <p className="py-2 text-center text-muted-foreground text-xs">目前系統中無註冊的技師</p>;
    }

    return (
      <Select value={selectedTechId} onValueChange={setSelectedTechId} disabled={isSubmitting}>
        <SelectTrigger className="w-full text-xs sm:text-sm">
          <SelectValue placeholder="請選擇技師..." />
        </SelectTrigger>
        <SelectContent>
          {technicians.map((tech) => (
            <SelectItem key={tech.id} value={tech.id} className="text-xs sm:text-sm">
              {tech.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <>
      <Button variant="default" size="sm" className="gap-1.5 text-xs shadow-xs" onClick={() => setOpen(true)}>
        <UserPlus className="size-3.5" />
        <span>指派技師</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="size-5 text-primary" />
                指派報修單據技師
              </DialogTitle>
              <DialogDescription>
                請選擇欲負責此單據的維修技師。指派後單據狀態將自動變更為「維修中」。
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">{renderSelectContent()}</div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedTechId || isLoadingTechs} className="gap-1.5">
                {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
                <span>確認指派</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
