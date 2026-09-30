"use client";

import { Keyboard, RotateCcw, TriangleAlert, X } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { ShortcutKeys, type ShortcutPlatform, useShortcutApple } from "../keyboard-shortcuts/keyboard-shortcuts";
import {
  type HotkeyBinding,
  type HotkeyConflict,
  type HotkeyIssueCode,
  type HotkeyStep,
  hotkeyConflicts,
  hotkeyFormat,
  hotkeyLabel,
  hotkeyRecordKey,
  hotkeyReservedBy,
  hotkeyValidate,
} from "./hotkey-logic";

const STRINGS = {
  en: {
    notSet: "Not set",
    press: "Press the keys",
    pressSequence: "Press the keys, then Enter",
    escHint: "Esc cancels",
    record: "Record a shortcut",
    change: "Change shortcut",
    clear: "Clear shortcut",
    reset: "Reset to default",
    resetAll: "Reset all",
    saved: "Shortcut set to {shortcut}",
    cleared: "Shortcut cleared",
    recording: "Recording. Press the shortcut you want.",
    duplicate: "Already used by {label}.",
    shadows: "Would block {label}, which starts the same way.",
    shadowed: "Would never run: {label} uses the first keys.",
    browser: "The browser keeps this shortcut. Choose another.",
    system: "The operating system keeps this shortcut. Choose another.",
    modifierRequired: "Add Ctrl, Alt or Command: a bare key would fire while you type.",
    invalid: "That is not a usable shortcut.",
    sequenceNotAllowed: "Use one key combination, not a sequence.",
    tooLong: "That sequence is too long.",
    empty: "Press a key to record it.",
    then: "then",
    defaultIs: "Default",
  },
  ar: {
    notSet: "غير محدد",
    press: "اضغط المفاتيح",
    pressSequence: "اضغط المفاتيح ثم Enter",
    escHint: "Esc للإلغاء",
    record: "سجّل اختصارًا",
    change: "غيّر الاختصار",
    clear: "امسح الاختصار",
    reset: "إعادة إلى الافتراضي",
    resetAll: "إعادة الكل",
    saved: "تم تعيين الاختصار إلى {shortcut}",
    cleared: "تم مسح الاختصار",
    recording: "جارٍ التسجيل. اضغط الاختصار الذي تريده.",
    duplicate: "مستخدم بالفعل في {label}.",
    shadows: "سيعطّل {label} لأنه يبدأ بالمفاتيح نفسها.",
    shadowed: "لن يعمل أبدًا: {label} يستخدم المفاتيح الأولى.",
    browser: "المتصفح يحتفظ بهذا الاختصار. اختر غيره.",
    system: "نظام التشغيل يحتفظ بهذا الاختصار. اختر غيره.",
    modifierRequired: "أضف Ctrl أو Alt أو Command: المفتاح وحده يعمل أثناء الكتابة.",
    invalid: "هذا اختصار غير صالح.",
    sequenceNotAllowed: "استخدم مجموعة مفاتيح واحدة وليس تسلسلًا.",
    tooLong: "التسلسل طويل جدًا.",
    empty: "اضغط مفتاحًا لتسجيله.",
    then: "ثم",
    defaultIs: "الافتراضي",
  },
};
export type HotkeyRecorderLabels = Partial<typeof STRINGS.en>;

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");

/** Another binding, with a name to show when it clashes. */
export interface HotkeyRecorderBinding extends HotkeyBinding {
  label: string;
}

export interface HotkeyRecorderProps {
  /** The shortcut as a string ("Mod+Shift+K", "G I"), or null when none is set. Controlled. */
  value?: string | null;
  defaultValue?: string | null;
  /** Called with the new shortcut, or null when it is cleared. */
  onValueChange?: (value: string | null) => void;
  /** Allow "G I" sequences: keys keep adding until Enter. Default false: one key combination. */
  sequence?: boolean;
  /** Refuse a bare key such as "K": it would fire while people type. Default false. */
  requireModifier?: boolean;
  /** Everything else that is bound, to warn about clashes. */
  bindings?: readonly HotkeyRecorderBinding[];
  /** The id of this shortcut inside `bindings`, so it does not clash with itself. */
  bindingId?: string;
  /** Let people record shortcuts the browser or OS keeps (Ctrl+W). Default false. */
  allowReserved?: boolean;
  /** Shows a reset button when the value differs. */
  resetTo?: string | null;
  platform?: ShortcutPlatform;
  disabled?: boolean;
  /** Accessible name of the recorder: what the shortcut does. */
  label?: string;
  id?: string;
  locale?: string;
  labels?: HotkeyRecorderLabels;
  className?: string;
}

/**
 * Records a keyboard shortcut. Click it (or focus it and press Enter), then press the keys. It reads the physical key,
 * so it works on an Arabic layout, refuses shortcuts the browser keeps, and warns when another action already uses the
 * keys. Escape cancels, Backspace clears.
 */
export function HotkeyRecorder({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  sequence = false,
  requireModifier = false,
  bindings,
  bindingId,
  allowReserved = false,
  resetTo,
  platform = "auto",
  disabled,
  label,
  id,
  locale: localeProp,
  labels,
  className,
}: HotkeyRecorderProps) {
  const ambient = useOptionalNasaq()?.locale ?? "en";
  const locale = localeProp ?? ambient;
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const uid = useId();
  const apple = useShortcutApple(platform);
  const [inner, setInner] = useState<string | null>(defaultValue);
  const value = valueProp === undefined ? inner : valueProp;
  const [recording, setRecording] = useState(false);
  const [steps, setSteps] = useState<HotkeyStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const button = useRef<HTMLButtonElement>(null);

  const commit = (next: string | null) => {
    if (valueProp === undefined) setInner(next);
    onValueChange?.(next);
    setAnnounce(next ? fill(t.saved, { shortcut: hotkeyLabel(next, apple, t.then) }) : t.cleared);
  };

  const stop = () => {
    setRecording(false);
    setSteps([]);
  };

  const messageFor = (code: HotkeyIssueCode): string =>
    code === "modifier-required" ? t.modifierRequired : code === "sequence-not-allowed" ? t.sequenceNotAllowed : code === "too-long" ? t.tooLong : code === "empty" ? t.empty : t.invalid;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!recording) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setError(null);
        setRecording(true);
        setAnnounce(t.recording);
      }
      return;
    }
    // While recording, the page must not see the keys: Ctrl+S would save the page, Tab would leave the control.
    event.preventDefault();
    event.stopPropagation();
    const native = event.nativeEvent;
    const result = hotkeyRecordKey(steps, native, { apple, sequence });
    if (result.status === "ignored") return;
    if (result.status === "cancelled") {
      stop();
      return;
    }
    if (result.status === "cleared") {
      stop();
      setError(null);
      commit(null);
      return;
    }
    if (result.status === "recording") {
      setSteps(result.steps);
      return;
    }
    const next = hotkeyFormat(result.steps);
    const issue = hotkeyValidate(next, { requireModifier, sequence });
    const owner = allowReserved ? null : hotkeyReservedBy(next, apple);
    stop();
    if (issue) {
      setError(messageFor(issue));
      return;
    }
    if (owner) {
      setError(owner === "browser" ? t.browser : t.system);
      return;
    }
    setError(null);
    commit(next);
  };

  // Recording ends when focus leaves; a half-typed sequence is dropped.
  useEffect(() => {
    if (disabled && recording) stop();
  }, [disabled, recording]);

  const conflicts = useMemo<HotkeyConflict[]>(
    () => (value && bindings ? hotkeyConflicts(value, bindings, { apple, ignoreId: bindingId }) : []),
    [value, bindings, apple, bindingId],
  );
  const nameOf = (c: HotkeyConflict) => bindings?.find((b) => b.id === c.id)?.label ?? c.id;
  const conflictText = (c: HotkeyConflict) => fill(c.kind === "duplicate" ? t.duplicate : c.kind === "shadows" ? t.shadows : t.shadowed, { label: nameOf(c) });
  const errorId = `${uid}-error`;
  const canReset = resetTo !== undefined && resetTo !== value;

  return (
    <div data-slot="hotkey-recorder" data-recording={recording || undefined} className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <button
          ref={button}
          id={id}
          type="button"
          disabled={disabled}
          aria-label={label ? `${label}: ${value ? hotkeyLabel(value, apple, t.then) : t.notSet}` : value ? t.change : t.record}
          aria-describedby={error || conflicts.length ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          data-invalid={error ? "" : undefined}
          onClick={() => {
            if (disabled) return;
            setError(null);
            setRecording(true);
            setAnnounce(t.recording);
          }}
          onKeyDown={onKeyDown}
          onBlur={stop}
          className={cn(
            "flex min-h-control min-w-0 flex-1 items-center gap-2 rounded-control border border-input bg-card px-3 text-start text-body text-foreground outline-none",
            "transition-colors duration-150 ease-nq focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus",
            "disabled:cursor-not-allowed disabled:opacity-50",
            recording && "border-nq-focus outline-1 outline-nq-focus",
            error && "border-nq-danger",
          )}
        >
          <Keyboard aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          {recording ? (
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
              {steps.length > 0 ? <ShortcutKeys shortcut={hotkeyFormat(steps)} platform={platform} thenLabel={t.then} /> : null}
              <span className="text-body-sm text-muted-foreground">{sequence ? t.pressSequence : t.press}</span>
            </span>
          ) : value ? (
            <ShortcutKeys shortcut={value} platform={platform} thenLabel={t.then} />
          ) : (
            <span className="text-muted-foreground">{t.notSet}</span>
          )}
          {recording ? <span className="ms-auto shrink-0 text-caption text-muted-foreground">{t.escHint}</span> : null}
        </button>
        {value && !disabled ? (
          <Button type="button" variant="ghost" size="icon" aria-label={t.clear} onClick={() => (setError(null), commit(null))}>
            <X aria-hidden />
          </Button>
        ) : null}
        {canReset && !disabled ? (
          <Button type="button" variant="ghost" size="icon" aria-label={t.reset} title={resetTo ? `${t.defaultIs}: ${hotkeyLabel(resetTo, apple, t.then)}` : t.reset} onClick={() => (setError(null), commit(resetTo ?? null))}>
            <RotateCcw aria-hidden />
          </Button>
        ) : null}
      </div>
      {error || conflicts.length ? (
        <ul id={errorId} role="list" className="flex flex-col gap-0.5">
          {error ? (
            <li role="alert" className="flex items-start gap-1.5 text-caption text-nq-danger-text">
              <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </li>
          ) : null}
          {conflicts.map((c) => (
            <li key={c.id} data-conflict={c.kind} className="flex items-start gap-1.5 text-caption text-nq-warning-text">
              <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              {conflictText(c)}
            </li>
          ))}
        </ul>
      ) : null}
      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ list of bindings */

export interface HotkeyBindingItem {
  id: string;
  label: string;
  labelAr?: string;
  description?: string;
  descriptionAr?: string;
  /** Section heading. Items with the same group sit together, in first-seen order. */
  group?: string;
  groupAr?: string;
  /** The current shortcut, or null when none is set. */
  shortcut: string | null;
  /** What Reset goes back to. */
  defaultShortcut?: string | null;
  /** Shown but not editable (Esc closes dialogs). */
  locked?: boolean;
}

export interface HotkeyBindingsProps {
  bindings: readonly HotkeyBindingItem[];
  /** Called when one binding changes. Reject or resolve `{ error }` to keep the old shortcut. */
  onChange: (id: string, shortcut: string | null) => void | { error?: string } | Promise<void | { error?: string }>;
  sequence?: boolean;
  requireModifier?: boolean;
  platform?: ShortcutPlatform;
  /** Text above the list. Pass `null` to hide it. */
  title?: ReactNode | null;
  locale?: string;
  labels?: HotkeyRecorderLabels;
  className?: string;
}

const pick = (en: string | undefined, ar: string | undefined, locale: string) => (locale.startsWith("ar") ? ar || en : en || ar) ?? "";

/**
 * A settings list of shortcuts, one recorder per action, with clash warnings across the whole list and reset to
 * defaults. Presentational: it reports each change and you store it.
 */
export function HotkeyBindings({ bindings, onChange, sequence, requireModifier = true, platform, title, locale: localeProp, labels, className }: HotkeyBindingsProps) {
  const ambient = useOptionalNasaq()?.locale ?? "en";
  const locale = localeProp ?? ambient;
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const uid = useId();
  const [failure, setFailure] = useState<string | null>(null);

  const others = useMemo<HotkeyRecorderBinding[]>(
    () => bindings.filter((b) => b.shortcut).map((b) => ({ id: b.id, shortcut: b.shortcut as string, label: pick(b.label, b.labelAr, locale) })),
    [bindings, locale],
  );

  const groups = useMemo(() => {
    const map = new Map<string, { title: string; items: HotkeyBindingItem[] }>();
    for (const b of bindings) {
      const key = b.group ?? "";
      const entry = map.get(key) ?? { title: pick(b.group, b.groupAr, locale), items: [] };
      entry.items.push(b);
      map.set(key, entry);
    }
    return [...map.entries()];
  }, [bindings, locale]);

  const change = async (id: string, shortcut: string | null) => {
    setFailure(null);
    try {
      const result = await onChange(id, shortcut);
      if (result && typeof result === "object" && result.error) setFailure(result.error);
    } catch {
      setFailure(t.invalid);
    }
  };
  const differing = bindings.filter((b) => !b.locked && b.defaultShortcut !== undefined && b.defaultShortcut !== b.shortcut);
  const heading = title === undefined ? null : title;

  return (
    <div data-slot="hotkey-bindings" className={cn("flex min-w-0 flex-col gap-5", className)}>
      {heading || differing.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {heading ? <h2 className="text-title text-foreground">{heading}</h2> : <span />}
          {differing.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                for (const b of differing) void change(b.id, b.defaultShortcut ?? null);
              }}
            >
              <RotateCcw aria-hidden />
              {t.resetAll}
            </Button>
          ) : null}
        </div>
      ) : null}
      {failure ? (
        <p role="alert" className="text-body-sm text-nq-danger-text">
          {failure}
        </p>
      ) : null}
      {groups.map(([key, group]) => (
        <section key={key} aria-labelledby={group.title ? `${uid}-${key}` : undefined} className="flex flex-col">
          {group.title ? (
            <h3 id={`${uid}-${key}`} className="pb-2 text-label text-foreground">
              {group.title}
            </h3>
          ) : null}
          <ul role="list" className="flex flex-col divide-y divide-border border-y border-border">
            {group.items.map((b) => {
              const name = pick(b.label, b.labelAr, locale);
              const description = pick(b.description, b.descriptionAr, locale);
              return (
                <li key={b.id} data-binding={b.id} className="grid grid-cols-1 items-start gap-x-6 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-body text-foreground">{name}</span>
                    {description ? <span className="text-caption text-muted-foreground">{description}</span> : null}
                  </div>
                  <HotkeyRecorder
                    value={b.shortcut}
                    onValueChange={(next) => void change(b.id, next)}
                    sequence={sequence}
                    requireModifier={requireModifier}
                    bindings={others}
                    bindingId={b.id}
                    resetTo={b.defaultShortcut}
                    platform={platform}
                    disabled={b.locked}
                    label={name}
                    locale={locale}
                    labels={labels}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
