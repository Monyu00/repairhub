"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";

import type { PasskeyListItem } from "@supabase/supabase-js";
import { Fingerprint, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { describePasskeyError } from "@/lib/supabase/passkey-errors";

type Passkey = PasskeyListItem;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function PasskeyManagementCard() {
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Passkey | null>(null);

  const loadPasskeys = useCallback(async () => {
    const { data, error } = await createClient().auth.passkey.list();
    if (error) {
      setError(describePasskeyError(error));
      setPasskeys([]);
      return;
    }

    setError(null);
    setPasskeys(data ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void loadPasskeys().then(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
  }, [loadPasskeys]);

  async function registerPasskey() {
    setBusy(true);
    setError(null);

    const { error } = await createClient().auth.registerPasskey();
    setBusy(false);

    if (error) {
      setError(describePasskeyError(error));
      return;
    }

    toast.success("Passkey 註冊成功。");
    await loadPasskeys();
  }

  async function deletePasskey() {
    if (!pendingDelete) return;

    setDeletingId(pendingDelete.id);
    setError(null);

    const { error } = await createClient().auth.passkey.delete({ passkeyId: pendingDelete.id });
    setDeletingId(null);

    if (error) {
      setError(describePasskeyError(error));
      return;
    }

    toast.success("Passkey 已刪除。");
    setPasskeys((previous) => previous?.filter((passkey) => passkey.id !== pendingDelete.id) ?? []);
    setPendingDelete(null);
  }

  let passkeyContent: ReactNode;
  if (passkeys === null) {
    passkeyContent = <Skeleton className="h-16 w-full" />;
  } else if (passkeys.length === 0) {
    passkeyContent = (
      <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">尚未註冊 Passkey。</p>
    );
  } else {
    passkeyContent = (
      <ul className="flex flex-col gap-2">
        {passkeys.map((passkey) => (
          <li className="flex items-start justify-between gap-3 rounded-lg border p-3" key={passkey.id}>
            <div className="min-w-0">
              <p className="text-foreground truncate text-sm font-medium">
                {passkey.friendly_name ?? "未命名 Passkey"}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                建立於 {formatDateTime(passkey.created_at)}；
                {passkey.last_used_at ? `最後使用於 ${formatDateTime(passkey.last_used_at)}` : "未曾使用"}
              </p>
            </div>
            <AlertDialog
              onOpenChange={(open) => {
                if (!open) setPendingDelete(null);
              }}
              open={pendingDelete?.id === passkey.id}
            >
              <AlertDialogTrigger asChild>
                <Button
                  aria-label={`刪除 ${passkey.friendly_name ?? "未命名 Passkey"}`}
                  onClick={() => setPendingDelete(passkey)}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>刪除此 Passkey？</AlertDialogTitle>
                  <AlertDialogDescription>刪除後將無法使用此 Passkey 登入。</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletingId !== null}>取消</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deletingId !== null}
                    onClick={(event) => {
                      event.preventDefault();
                      void deletePasskey();
                    }}
                  >
                    {deletingId !== null ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Trash2 />}
                    刪除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="text-primary size-4" />
          Passkey
        </CardTitle>
        <CardDescription>使用裝置的生物辨識或安全金鑰登入；密碼仍可作為備援。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Passkey 操作失敗</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {passkeyContent}

        <div className="flex justify-end">
          <Button disabled={busy || passkeys === null} type="button" onClick={() => void registerPasskey()}>
            {busy ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Fingerprint data-icon="inline-start" />
            )}
            新增 Passkey
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
