"use client";

import { useState, useTransition } from "react";

import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import {
  bindDiscordWebhook,
  type MyProfile,
  removeDiscordWebhook,
  updateDiscordWebhookEnabled,
} from "@/server/personal-settings/actions";

interface DiscordWebhookCardProps {
  profile: MyProfile;
  onSaved: (patch: Partial<MyProfile>) => void;
}

export function DiscordWebhookCard({ profile, onSaved }: DiscordWebhookCardProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [enabled, setEnabled] = useState(profile.socialWebhook?.enabled ?? false);
  const [isPending, startTransition] = useTransition();
  const isBound = profile.socialWebhook !== null;

  const bind = () => {
    startTransition(async () => {
      const result = await bindDiscordWebhook({ webhookUrl: webhookUrl.trim() });

      if (!result.success) {
        toast.error("Discord Webhook 綁定失敗", { description: result.error });
        return;
      }

      setWebhookUrl("");
      setEnabled(false);
      onSaved({ socialWebhook: { enabled: false } });
      toast.success("測試訊息已送出，Discord Webhook 已綁定");
    });
  };

  const remove = () => {
    startTransition(async () => {
      const result = await removeDiscordWebhook();

      if (!result.success) {
        toast.error("Discord Webhook 移除失敗", { description: result.error });
        return;
      }

      setWebhookUrl("");
      setEnabled(false);
      onSaved({ socialWebhook: null });
      toast.success("Discord Webhook 已移除");
    });
  };

  const toggle = (checked: boolean) => {
    setEnabled(checked);

    startTransition(async () => {
      const result = await updateDiscordWebhookEnabled({ enabled: checked });

      if (!result.success) {
        setEnabled(!checked);
        toast.error("社交通知開關更新失敗", { description: result.error });
        return;
      }

      onSaved({ socialWebhook: { enabled: checked } });
      toast.success(checked ? "社交通知已開啟" : "社交通知已關閉");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          社交通知
          <Badge variant={isBound ? "success" : "secondary"}>{isBound ? "已綁定" : "未綁定"}</Badge>
        </CardTitle>
        <CardDescription>綁定 Discord Webhook 後才能開啟社交通知；系統不會顯示已保存的 Webhook URL。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field orientation="horizontal" data-disabled={!isBound}>
          <FieldContent>
            <label className="text-sm font-medium" htmlFor="social-notification-switch">
              社交通知
            </label>
            <p className="text-muted-foreground text-xs" id="social-notification-switch-description">
              {!isBound && "請先綁定 Discord Webhook。"}
              {isBound && enabled && "目前會傳送社交通知。"}
              {isBound && !enabled && "目前已綁定，但社交通知關閉。"}
            </p>
          </FieldContent>
          <Switch
            id="social-notification-switch"
            aria-describedby="social-notification-switch-description"
            checked={enabled}
            onCheckedChange={toggle}
            disabled={!isBound || isPending}
          />
        </Field>

        <FieldGroup>
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              bind();
            }}
          >
            <Field>
              <FieldLabel htmlFor="discord-webhook-url">
                {isBound ? "更換 Discord Webhook" : "Discord Webhook URL"}
              </FieldLabel>
              <InputGroup data-disabled={isPending}>
                <InputGroupInput
                  id="discord-webhook-url"
                  autoComplete="off"
                  inputMode="url"
                  onChange={(event) => setWebhookUrl(event.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  required
                  spellCheck={false}
                  type="url"
                  value={webhookUrl}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton disabled={isPending} size="sm" type="submit" variant="outline">
                    {isBound ? "測試並更換" : "測試並綁定"}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>保存前會先送出一則測試訊息，只有成功才會更新綁定。</FieldDescription>
            </Field>
          </form>

          {isBound ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="self-start" disabled={isPending} variant="outline">
                  移除 Webhook
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>移除 Discord Webhook？</AlertDialogTitle>
                  <AlertDialogDescription>
                    移除後會同時關閉社交通知，Ticket 事件不再送到 Discord。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={remove} variant="destructive">
                    移除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
