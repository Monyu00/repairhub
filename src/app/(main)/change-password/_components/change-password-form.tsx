"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { changeRequiredPassword } from "../_actions/actions";

export function ChangePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: { password?: string; confirm?: string; form?: string } = {};

    if (password.length < 8) {
      nextErrors.password = "新密碼至少需要 8 個字元";
    }
    if (password !== confirmPassword) {
      nextErrors.confirm = "兩次輸入的新密碼不一致";
    }
    setErrors(nextErrors);
    if (nextErrors.password || nextErrors.confirm) {
      return;
    }

    setIsPending(true);
    const result = await changeRequiredPassword(password);
    setIsPending(false);

    if (!result.success) {
      setErrors({ form: result.error ?? "密碼變更失敗，請稍後再試" });
      return;
    }

    toast.success("密碼變更成功");
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="required-new-password">新密碼（至少 8 字元）</FieldLabel>
          <Input
            id="required-new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && <FieldError>{errors.password}</FieldError>}
        </Field>
        <Field data-invalid={Boolean(errors.confirm)}>
          <FieldLabel htmlFor="required-confirm-password">確認新密碼</FieldLabel>
          <Input
            id="required-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
            aria-invalid={Boolean(errors.confirm)}
          />
          {errors.confirm && <FieldError>{errors.confirm}</FieldError>}
        </Field>
      </FieldGroup>
      {errors.form && (
        <Alert variant="destructive">
          <AlertTitle>密碼變更失敗</AlertTitle>
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Lock data-icon="inline-start" />}
        變更密碼
      </Button>
    </form>
  );
}
