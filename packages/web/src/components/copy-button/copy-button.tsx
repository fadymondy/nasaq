"use client";

import { Check, Copy } from "lucide-react";
import { type ComponentProps, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button, type ButtonProps } from "../button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";

const STRINGS = {
  en: { copy: "Copy", copied: "Copied to clipboard", failed: "Could not copy" },
  ar: { copy: "نسخ", copied: "تم النسخ إلى الحافظة", failed: "تعذر النسخ" },
};

function useStrings() {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return STRINGS[ar ? "ar" : "en"];
}

/** Writes text to the clipboard. Uses the async Clipboard API, then a hidden textarea when it is unavailable (insecure origins, old browsers). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or not focused: try the fallback below.
  }
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;inset-block-start:0;inset-inline-start:0;opacity:0;pointer-events:none";
  const active = document.activeElement as HTMLElement | null;
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  active?.focus?.();
  return ok;
}

export interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "onCopy" | "value" | "children"> {
  /** The text to copy, or a function that returns it at click time. */
  value: string | (() => string);
  /** Accessible name. Default "Copy" / "نسخ" by the Nasaq locale. */
  label?: string;
  /** Announced to screen readers after a copy. Default "Copied to clipboard" / "تم النسخ إلى الحافظة". */
  copiedLabel?: string;
  /** Announced when copying failed. */
  failedLabel?: string;
  /** How long the check state stays, in milliseconds. Default 1500. */
  resetAfter?: number;
  onCopy?: (text: string) => void;
  onCopyError?: () => void;
  /** Visible text next to the icon. Omit for an icon-only button. */
  children?: ReactNode;
}

/**
 * An icon button that copies text and shows a check for about 1.5 seconds. The result is also announced
 * through a polite live region. Without the Clipboard API it falls back to a hidden textarea.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  failedLabel,
  resetAfter = 1500,
  onCopy,
  onCopyError,
  children,
  className,
  variant = "ghost",
  size,
  ...props
}: CopyButtonProps) {
  const t = useStrings();
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    const text = typeof value === "function" ? value() : value;
    const ok = await copyText(text);
    clearTimeout(timer.current);
    setState(ok ? "copied" : "failed");
    timer.current = setTimeout(() => setState("idle"), resetAfter);
    if (ok) onCopy?.(text);
    else onCopyError?.();
  }, [value, resetAfter, onCopy, onCopyError]);

  const iconOnly = children === undefined;
  const name = label ?? t.copy;
  return (
    <>
      <Button
        type="button"
        data-slot="copy-button"
        data-copied={state === "copied" || undefined}
        variant={variant}
        size={size ?? (iconOnly ? "icon-sm" : "sm")}
        aria-label={iconOnly ? name : undefined}
        className={cn("data-copied:text-nq-success-text", className as string)}
        onClick={copy}
        {...props}
      >
        {state === "copied" ? <Check aria-hidden /> : <Copy aria-hidden />}
        {iconOnly ? null : (children ?? name)}
      </Button>
      <span data-slot="copy-button-status" role="status" aria-live="polite" className="sr-only">
        {state === "copied" ? (copiedLabel ?? t.copied) : state === "failed" ? (failedLabel ?? t.failed) : ""}
      </span>
    </>
  );
}

export interface CopyFieldProps extends Omit<ComponentProps<typeof InputGroup>, "onCopy"> {
  /** The value shown and copied. */
  value: string;
  /** Accessible name of the input and the button's label. Prefer a visible Field label instead when there is one. */
  label?: string;
  copyLabel?: string;
  copiedLabel?: string;
  onCopy?: (text: string) => void;
  /** Extra props for the read-only input, e.g. `id` or `name`. */
  inputProps?: Omit<ComponentProps<typeof InputGroupInput>, "value" | "readOnly" | "ltr">;
}

/**
 * A read-only field with a copy button, for API keys, invite links and URLs. The value is always
 * left-to-right, also in Arabic, and selects on focus so it can be copied by hand.
 */
export function CopyField({ value, label, copyLabel, copiedLabel, onCopy, inputProps, className, ...props }: CopyFieldProps) {
  return (
    <InputGroup data-slot="copy-field" className={className} {...props}>
      <InputGroupInput
        readOnly
        ltr
        value={value}
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
        {...inputProps}
      />
      <InputGroupAddon align="end">
        <CopyButton value={value} label={copyLabel} copiedLabel={copiedLabel} onCopy={onCopy} />
      </InputGroupAddon>
    </InputGroup>
  );
}
