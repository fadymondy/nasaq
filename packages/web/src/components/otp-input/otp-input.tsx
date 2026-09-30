"use client";

import { Input as BaseInput } from "@base-ui/react/input";
import { type ClipboardEvent, type ComponentProps, type KeyboardEvent, useRef, useState } from "react";
import { cn } from "../../lib/cn";

export interface OtpInputProps extends Omit<ComponentProps<"div">, "onChange" | "defaultValue" | "dir"> {
  /** Number of boxes. Default 6. */
  length?: number;
  /** Controlled value (up to `length` characters). */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called once every box is filled, with the full code. */
  onComplete?: (value: string) => void;
  /** `numeric` (default) accepts digits and opens the numeric keypad; `alphanumeric` accepts letters too. */
  type?: "numeric" | "alphanumeric";
  /** Form field name. A hidden input carries the joined code. */
  name?: string;
  disabled?: boolean;
  /** Mark the boxes invalid (also picked up from a surrounding `Field invalid`). */
  invalid?: boolean;
  autoFocus?: boolean;
  /** Accessible name of each box. Localise. Default "Digit 1 of 6". */
  getBoxLabel?: (index: number, length: number) => string;
}

const boxClass = [
  "size-control min-h-[var(--nq-touch-min,0px)] min-w-0 rounded-control border border-input bg-card p-0 text-center text-body font-medium tabular-nums text-foreground",
  "transition-colors duration-150 ease-nq outline-none",
  "focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus",
  "data-invalid:border-nq-danger aria-invalid:border-nq-danger",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "pointer-coarse:text-[16px]",
];

/**
 * One-time-code entry: `length` boxes, paste fills them all, Backspace steps back. The group is forced
 * left-to-right so digits keep their order inside RTL pages.
 */
export function OtpInput({
  length = 6,
  value,
  defaultValue = "",
  onValueChange,
  onComplete,
  type = "numeric",
  name,
  disabled,
  invalid,
  autoFocus,
  getBoxLabel = (i, n) => `Digit ${i + 1} of ${n}`,
  className,
  ...props
}: OtpInputProps) {
  const [inner, setInner] = useState(defaultValue);
  const current = (value ?? inner).slice(0, length);
  // Latest code, updated synchronously so focus handlers fired before the re-render see it.
  const latest = useRef(current);
  latest.current = current;
  const refs = useRef<(HTMLElement | null)[]>([]);
  const allowed = type === "numeric" ? /[0-9]/ : /[a-zA-Z0-9]/;
  const clean = (s: string) => [...s].filter((c) => allowed.test(c)).join("");

  const commit = (next: string) => {
    latest.current = next;
    if (value === undefined) setInner(next);
    onValueChange?.(next);
    if (next.length === length) onComplete?.(next);
  };
  const focusBox = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    (el as HTMLInputElement | null)?.select();
  };
  /** Write `text` from box `start`; the code is kept dense (no holes). */
  const fill = (start: number, text: string) => {
    const chars = current.split("");
    const room = text.slice(0, length - start);
    for (let k = 0; k < room.length; k++) chars[start + k] = room[k] as string;
    const next = chars.join("");
    commit(next);
    focusBox(Math.min(start + room.length, length - 1));
  };

  const onChange = (i: number, raw: string) => {
    const text = clean(raw);
    if (!text) {
      // The typed character was rejected, or the box was emptied.
      const chars = current.split("");
      if (raw === "" && i < chars.length) {
        chars.splice(i, 1);
        commit(chars.join(""));
      }
      return;
    }
    fill(Math.min(i, current.length), text);
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !current[i]) {
      e.preventDefault();
      if (i > 0) {
        commit(current.slice(0, i - 1) + current.slice(i));
        focusBox(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(i + 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusBox(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusBox(length - 1);
    }
  };

  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = clean(e.clipboardData.getData("text"));
    if (!text) return;
    if (text.length >= length) {
      commit(text.slice(0, length));
      focusBox(length - 1);
    } else {
      fill(Math.min(i, current.length), text);
    }
  };

  return (
    <div
      role="group"
      dir="ltr"
      data-slot="otp-input"
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    >
      {Array.from({ length }, (_, i) => (
        <BaseInput
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          data-slot="otp-input-box"
          data-filled={current[i] ? "" : undefined}
          aria-label={getBoxLabel(i, length)}
          aria-invalid={invalid || undefined}
          data-invalid={invalid ? "" : undefined}
          type="text"
          inputMode={type === "numeric" ? "numeric" : "text"}
          autoComplete="one-time-code"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={i === 0 || !current[i] ? length : 1}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          value={current[i] ?? ""}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={(e) => onPaste(i, e)}
          onFocus={(e) => {
            // Never leave a gap: land on the first empty box.
            if (i > latest.current.length) focusBox(latest.current.length);
            else e.currentTarget.select();
          }}
          className={cn(boxClass)}
        />
      ))}
      {name ? <input type="hidden" name={name} value={current} /> : null}
    </div>
  );
}
