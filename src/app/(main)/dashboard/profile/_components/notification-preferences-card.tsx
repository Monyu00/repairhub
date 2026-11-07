"use client";

import { useState, useTransition } from "react";

import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

import { type MyProfile, updateNotificationPreferences } from "../_actions/profile-actions";

interface NotificationPreferencesCardProps {
  profile: MyProfile;
}

export function NotificationPreferencesCard({ profile }: NotificationPreferencesCardProps) {
  const [preferences, setPreferences] = useState(profile.preferences);
  const [isPending, startTransition] = useTransition();
  const isTechnician = profile.role === "technician";

  const toggle = (key: "ticketStatus" | "newTicket", value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);

    startTransition(async () => {
      const result = await updateNotificationPreferences(next);
      if (!result.success) {
        setPreferences(preferences);
        toast.error("通知設定儲存失敗", { description: result.error });
        return;
      }
      toast.success("通知設定已儲存");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>通知設定</CardTitle>
        <CardDescription>選擇你想收到的電子郵件通知，關閉後系統不會再寄送對應通知。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
          <div className="space-y-1">
            <label className="font-medium text-sm" htmlFor="pref-ticket-status">
              我報修單據的狀態變更
            </label>
            <p className="text-muted-foreground text-xs" id="pref-ticket-status-description">
              你提出的報修單據在狀態變更時寄送通知。
            </p>
          </div>
          <Switch
            id="pref-ticket-status"
            checked={preferences.ticketStatus}
            onCheckedChange={(checked) => toggle("ticketStatus", checked)}
            disabled={isPending}
            aria-describedby="pref-ticket-status-description"
          />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
          <div className="space-y-1">
            <label className="font-medium text-sm" htmlFor="pref-new-ticket">
              我訂閱類別的新報修
            </label>
            <p className="text-muted-foreground text-xs" id="pref-new-ticket-description">
              {isTechnician
                ? "你訂閱的類別有新報修單據時寄送通知。"
                : "僅維修技師可訂閱類別並接收新報修通知，因此一般使用者與系統管理員無法使用此設定。"}
            </p>
          </div>
          <Switch
            id="pref-new-ticket"
            checked={isTechnician ? preferences.newTicket : false}
            onCheckedChange={(checked) => toggle("newTicket", checked)}
            disabled={isPending || !isTechnician}
            aria-describedby="pref-new-ticket-description"
          />
        </div>
      </CardContent>
    </Card>
  );
}
