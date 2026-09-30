"use client";

import { type Ref, useCallback, useEffect, useRef, useState } from "react";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";

/** What an auth form's `onSubmit` may resolve to: nothing on success, or a failure to show. */
export interface AuthSubmitFailure {
  /** A message for the whole form (wrong password, network down). Shown in the error summary. */
  error?: string;
  /** Messages keyed by field name (`email`, `password`, `code`…). Shown under the field. */
  fieldErrors?: Record<string, string>;
}
export type AuthSubmitResult = void | AuthSubmitFailure;
export type AuthLocale = "en" | "ar";

/** The built-in language for the current Nasaq locale. */
export function useAuthLocale(): AuthLocale {
  return useOptionalNasaq()?.locale.startsWith("ar") ? "ar" : "en";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = (value: string) => EMAIL.test(value.trim());

/** Seconds left on a resend timer. `start(n)` restarts it. */
export function useCooldown(initial = 0) {
  const [remaining, setRemaining] = useState(initial);
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(id);
  }, [remaining]);
  return { remaining, start: useCallback((seconds: number) => setRemaining(seconds), []) };
}

/** 0:27 style countdown. */
export const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export interface UseAuthFormOptions<V, K extends string> {
  onSubmit: (values: V) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Local checks that run before `onSubmit`. Return messages keyed by field name. */
  validate?: (values: V) => Partial<Record<K, string>>;
  /** Shown when `onSubmit` throws. */
  fallbackError: string;
}

/**
 * Submit state shared by the auth forms: pending flag, whole-form error, per-field errors, and focus.
 * After a failed submit focus moves to the first `aria-invalid` control, or to the summary when there is none.
 */
export function useAuthForm<V, K extends string = string>({ onSubmit, validate, fallbackError }: UseAuthFormOptions<V, K>) {
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [focusTick, setFocusTick] = useState(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!focusTick) return;
    const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (invalid ?? summaryRef.current)?.focus();
  }, [focusTick]);

  const submit = async (values: V) => {
    if (busy.current) return;
    setError(undefined);
    const local = validate?.(values) ?? {};
    if (Object.values(local).some(Boolean)) {
      setFieldErrors(local);
      setFocusTick((n) => n + 1);
      return;
    }
    setFieldErrors({});
    busy.current = true;
    setPending(true);
    try {
      const result = await onSubmit(values);
      if (result && mounted.current) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        if (result.error || (result.fieldErrors && Object.keys(result.fieldErrors).length)) setFocusTick((n) => n + 1);
      }
    } catch {
      if (mounted.current) {
        setError(fallbackError);
        setFocusTick((n) => n + 1);
      }
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };

  /** Clears one field's message as soon as the person edits it. */
  const clear = (name: string) => setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  const focusField = (name: string) => formRef.current?.querySelector<HTMLElement>(`[name="${name}"]`)?.focus();

  return { formRef, summaryRef, pending, error, setError, fieldErrors, setFieldErrors, submit, clear, focusField };
}

export interface AuthErrorSummaryProps {
  error?: string;
  fieldErrors: Partial<Record<string, string>>;
  /** Field name → the label people see, for the list of problems. */
  fieldLabels?: Record<string, string>;
  /** Heading when several fields have problems. */
  title: string;
  onFocusField?: (name: string) => void;
  ref?: Ref<HTMLDivElement>;
}

/** The form-level error box: the server message, or a list of the fields to fix. Focusable so it can take focus. */
export function AuthErrorSummary({ error, fieldErrors, fieldLabels, title, onFocusField, ref }: AuthErrorSummaryProps) {
  const entries = Object.entries(fieldErrors).filter((e): e is [string, string] => Boolean(e[1]));
  if (!error && !entries.length) return <div ref={ref} tabIndex={-1} className="sr-only" />;
  return (
    <div ref={ref} tabIndex={-1} data-slot="auth-error-summary" className="outline-none">
      <Alert tone="danger" title={error ?? title}>
        {!error && entries.length ? (
          <ul className="flex list-disc flex-col gap-0.5 ps-4">
            {entries.map(([name, message]) => (
              <li key={name}>
                <button type="button" onClick={() => onFocusField?.(name)} className="text-start underline underline-offset-2">
                  {fieldLabels?.[name] ? `${fieldLabels[name]}: ` : ""}
                  {message}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Alert>
    </div>
  );
}

/** True when the browser can do WebAuthn. False on the server and on the first render, so markup matches. */
export function usePasskeySupport() {
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(typeof PublicKeyCredential !== "undefined"), []);
  return supported;
}

/**
 * Starts passkey autofill (WebAuthn conditional UI) when the browser offers it. `start` gets an
 * AbortSignal that fires on unmount; the input needs autocomplete="username webauthn".
 */
export function useConditionalPasskey(start?: (signal: AbortSignal) => void | Promise<unknown>) {
  const latest = useRef(start);
  latest.current = start;
  const enabled = Boolean(start);
  useEffect(() => {
    if (!enabled || typeof PublicKeyCredential === "undefined") return;
    const controller = new AbortController();
    void (async () => {
      try {
        const available = await PublicKeyCredential.isConditionalMediationAvailable?.();
        if (available && !controller.signal.aborted) await latest.current?.(controller.signal);
      } catch {
        // Autofill is a bonus: a cancelled or failed prompt must never break the form.
      }
    })();
    return () => controller.abort();
  }, [enabled]);
}
