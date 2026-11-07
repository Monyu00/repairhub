"use client";

import { useState, useTransition } from "react";

import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

import { type MyProfile, updateNotificationPreferences } from "../_actions/profile-actions";
import { type NotificationPreferences, visibleNotificationPreferenceKeys } from "../_actions/profile-input";

interface NotificationOption {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}

const NOTIFICATION_OPTIONS: Record<keyof NotificationPreferences, NotificationOption> = {
  ticketStatus: {
    key: "ticketStatus",
    label: "我報修單據的狀態變更",
    description: "你提出的報修單據在「開始維修」、「維修完成」、「結案」時寄送通知。",
  },
  newTicket: {
    key: "newTicket",
    label: "我訂閱類別的新報修",
    description: "你訂閱的類別有新報修單據時寄送通知。",
  },
};

interface NotificationPreferencesCardProps {
  profile: MyProfile;
}

export function NotificationPreferencesCard({ profile }: NotificationPreferencesCardProps) {
  const [preferences, setPreferences] = useState(profile.preferences);
  const [isPending, startTransition] = useTransition();
  const options = visibleNotificationPreferenceKeys(profile.role).map((key) => NOTIFICATION_OPTIONS[key]);

  const toggle = (key: keyof NotificationPreferences, value: boolean) => {
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
        {options.map((option) => (
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3" key={option.key}>
            <div className="space-y-1">
              <label className="font-medium text-sm" htmlFor={`pref-${option.key}`}>
                {option.label}
              </label>
              <p className="text-muted-foreground text-xs" id={`pref-${option.key}-description`}>
                {option.description}
              </p>
            </div>
            <Switch
              id={`pref-${option.key}`}
              checked={preferences[option.key]}
              onCheckedChange={(checked) => toggle(option.key, checked)}
              disabled={isPending}
              aria-describedby={`pref-${option.key}-description`}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
