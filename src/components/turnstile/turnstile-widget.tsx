"use client";

import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from "react";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

import { Field, FieldError } from "@/components/ui/field";
import { TURNSTILE_ERROR_MESSAGE } from "@/lib/turnstile";

interface TurnstileWidgetProps extends React.ComponentProps<"div"> {
  onSuccess: (token: string) => void;
  onExpire?: () => void;
}

export interface TurnstileWidgetHandle {
  reset: () => void;
}

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(function TurnstileWidget(
  { className, onSuccess, onExpire, ...props },
  ref,
) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const errorId = useId();
  const [error, setError] = useState<string | null>(null);
  const [tokenReceived, setTokenReceived] = useState(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const handleFailure = useCallback(() => {
    setError(TURNSTILE_ERROR_MESSAGE);
    setTokenReceived(false);
    onExpireRef.current?.();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        setError(null);
        setTokenReceived(false);
        turnstileRef.current?.reset();
      },
    }),
    [],
  );

  useEffect(() => {
    if (!siteKey || tokenReceived) return;

    const timer = window.setTimeout(handleFailure, 12000);
    return () => window.clearTimeout(timer);
  }, [handleFailure, siteKey, tokenReceived]);

  if (!siteKey) {
    return (
      <Field data-invalid aria-invalid aria-label="安全驗證">
        <FieldError>驗證服務尚未設定，請聯絡系統管理者</FieldError>
      </Field>
    );
  }

  return (
    <Field
      className={className}
      data-invalid={Boolean(error)}
      aria-invalid={Boolean(error)}
      aria-label="安全驗證"
      aria-describedby={error ? errorId : undefined}
      {...props}
    >
      <Turnstile
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={(token) => {
          setError(null);
          setTokenReceived(true);
          onSuccess(token);
        }}
        onExpire={() => {
          setError(null);
          setTokenReceived(false);
          onExpire?.();
        }}
        onError={handleFailure}
        options={{
          language: "zh-tw",
          responseField: false,
          size: "flexible",
          theme: "auto",
        }}
        scriptOptions={{
          onError: handleFailure,
        }}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
});
