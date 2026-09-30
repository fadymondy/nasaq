"use client";

import { Check, Pencil, X } from "lucide-react";
import { type ComponentProps, type FocusEvent, type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Input, Textarea } from "../field";
import { Icon } from "../icon";
import { type InlineEditType, inlineKeyAction, resolveInlineCommit } from "./inline-edit-logic";

const STRINGS = {
  en: {
    edit: "Edit {label}",
    save: "Save",
    cancel: "Cancel",
    empty: "Add {label}",
    required: "This cannot be empty.",
    number: "Enter a number.",
    email: "Enter a valid email address.",
    url: "Enter a link starting with http:// or https://.",
    length: "Too long: at most {max} characters.",
    failed: "Could not save. Try again.",
    hintMulti: "Ctrl+Enter to save, Esc to cancel",
  },
  ar: {
    edit: "تعديل {label}",
    save: "حفظ",
    cancel: "إلغاء",
    empty: "أضف {label}",
    required: "لا يمكن ترك هذا الحقل فارغًا.",
    number: "أدخل رقمًا.",
    email: "أدخل بريدًا إلكترونيًا صحيحًا.",
    url: "أدخل رابطًا يبدأ بـ http:// أو https://.",
    length: "النص طويل: {max} حرفًا كحد أقصى.",
    failed: "تعذر الحفظ. حاول مرة أخرى.",
    hintMulti: "Ctrl+Enter للحفظ وEsc للإلغاء",
  },
};

export type InlineEditLabels = Partial<(typeof STRINGS)["en"]>;

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

export interface InlineEditProps extends Omit<ComponentProps<"div">, "onChange" | "children" | "defaultValue"> {
  /** The saved value. */
  value: string;
  /**
   * Save the new value. Return `{ error }` (or throw) to keep editing with the message shown under the field.
   * The field and buttons are busy while the promise is pending.
   */
  onSave: (value: string) => void | { error?: string } | undefined | Promise<void | { error?: string } | undefined>;
  /** Names the field for assistive tech ("Edit title") and fills the empty text ("Add title"). Required. */
  label: string;
  type?: InlineEditType;
  /** A textarea instead of a single line. Enter adds a line, Ctrl/Cmd+Enter saves. */
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  /** Return a message to reject the value. Runs after the built-in checks for `type`, `required` and `maxLength`. */
  validate?: (value: string) => string | undefined;
  /** What happens when focus leaves the open editor. Default `save`. */
  onBlurAction?: "save" | "cancel" | "none";
  /** Custom display, e.g. a linked or formatted value. Default the value as text. */
  renderValue?: (value: string) => ReactNode;
  /** Classes of the display text, so it matches the heading or paragraph it replaces (`text-h2`). */
  displayClassName?: string;
  /** Classes of the input. */
  inputClassName?: string;
  /** Force left-to-right entry, for codes and URLs in Arabic pages. Default true for `number`, `email` and `url`. */
  ltr?: boolean;
  disabled?: boolean;
  /** Show the value with no edit affordance. */
  readOnly?: boolean;
  /** Controlled editing state. */
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  labels?: InlineEditLabels;
}

/**
 * Edit in place: text that turns into an input on click (or Enter), with Save and Cancel. Enter saves, Escape cancels,
 * leaving the field saves (configurable). The save can be async and can reject with a message; the value is validated
 * for its `type` first. Focus goes back to the text afterwards so keyboard users keep their place.
 */
export function InlineEdit({
  value,
  onSave,
  label,
  type = "text",
  multiline = false,
  rows = 3,
  placeholder,
  required,
  maxLength,
  validate,
  onBlurAction = "save",
  renderValue,
  displayClassName,
  inputClassName,
  ltr,
  disabled,
  readOnly,
  editing: editingProp,
  onEditingChange,
  labels,
  className,
  ...props
}: InlineEditProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [inner, setInner] = useState(false);
  const editing = editingProp ?? inner;
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const busy = useRef(false);
  const errorId = useId();
  const forceLtr = ltr ?? (type === "number" || type === "email" || type === "url");

  const setEditing = (next: boolean) => {
    if (editingProp === undefined) setInner(next);
    onEditingChange?.(next);
  };

  // Restart from the saved value every time the editor opens.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only opening resets the draft
  useEffect(() => {
    if (editing) {
      setDraft(value);
      setError(undefined);
    }
  }, [editing]);

  useEffect(() => {
    if (!editing && restoreFocus.current) {
      restoreFocus.current = false;
      displayRef.current?.focus();
    }
  }, [editing]);

  const close = (focusBack: boolean) => {
    restoreFocus.current = focusBack;
    setError(undefined);
    setEditing(false);
  };

  const commit = async (focusBack: boolean) => {
    if (busy.current) return;
    const result = resolveInlineCommit({ draft, initial: value, type, required, maxLength, validate });
    if (result.kind === "unchanged") return close(focusBack);
    if (result.kind === "invalid") {
      setError(result.reason === "custom" ? result.message : result.reason === "length" ? fill(t.length, { max: maxLength ?? 0 }) : t[result.reason === "required" ? "required" : type === "number" ? "number" : type === "email" ? "email" : "url"]);
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      const outcome = await onSave(result.value);
      if (outcome && typeof outcome === "object" && outcome.error) {
        setError(outcome.error);
        return;
      }
      close(focusBack);
    } catch {
      setError(t.failed);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const action = inlineKeyAction({ key: e.key, shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey, isComposing: e.nativeEvent.isComposing }, multiline);
    if (!action) return;
    e.preventDefault();
    e.stopPropagation();
    if (action === "save") void commit(true);
    else close(true);
  };

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (rootRef.current?.contains(e.relatedTarget as Node | null) || busy.current || onBlurAction === "none") return;
    // A null relatedTarget is also a click on a non-focusable area or the window losing focus: only act when the editor is still open.
    if (onBlurAction === "cancel") close(false);
    else void commit(false);
  };

  const invalid = Boolean(error);
  const common = {
    autoFocus: true,
    value: draft,
    readOnly: pending,
    "aria-label": fill(t.edit, { label }),
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? errorId : undefined,
    placeholder,
    onKeyDown,
    onChange: (e: { target: { value: string } }) => {
      setDraft(e.target.value);
      if (error) setError(undefined);
    },
    onFocus: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!multiline) e.currentTarget.select();
    },
  };

  if (!editing) {
    const empty = value === "";
    return (
      <div data-slot="inline-edit" data-state="display" className={cn("min-w-0", className)} {...props}>
        <button
          ref={displayRef}
          type="button"
          disabled={disabled || readOnly}
          aria-label={readOnly ? undefined : fill(t.edit, { label })}
          onClick={() => setEditing(true)}
          className={cn(
            "group/inline -mx-1.5 inline-flex max-w-full min-w-0 cursor-text items-center gap-2 rounded-control px-1.5 py-0.5 text-start outline-none transition-colors duration-150 ease-nq",
            "hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus disabled:cursor-default disabled:hover:bg-transparent",
            readOnly && "cursor-default hover:bg-transparent",
          )}
        >
          <span dir="auto" className={cn("min-w-0 break-words", multiline && "whitespace-pre-wrap", empty && "text-muted-foreground", displayClassName)}>
            {empty ? (placeholder ?? fill(t.empty, { label })) : renderValue ? renderValue(value) : value}
          </span>
          {readOnly || disabled ? null : (
            <Icon icon={Pencil} className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/inline:opacity-100 group-focus-visible/inline:opacity-100 pointer-coarse:opacity-100" />
          )}
        </button>
      </div>
    );
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: a group of the field and its buttons, focus tracked for the blur behaviour
    <div ref={rootRef} role="group" aria-label={fill(t.edit, { label })} data-slot="inline-edit" data-state="editing" data-pending={pending || undefined} onBlur={onBlur} className={cn("flex min-w-0 flex-col gap-1.5", className)} {...props}>
      <div className={cn("flex gap-1.5", multiline ? "items-start" : "items-center")}>
        {multiline ? (
          <Textarea {...(common as ComponentProps<"textarea">)} rows={rows} dir="auto" className={cn("min-h-0", inputClassName)} />
        ) : (
          <Input
            {...(common as ComponentProps<typeof Input>)}
            type={type === "number" ? "text" : type}
            inputMode={type === "number" ? "decimal" : undefined}
            ltr={forceLtr}
            {...(forceLtr ? {} : { dir: "auto" as const })}
            className={cn("h-control-sm", inputClassName)}
          />
        )}
        <div className={cn("flex shrink-0 gap-1", multiline && "flex-col")}>
          <Button type="button" variant="primary" size="icon-sm" aria-label={t.save} loading={pending} onMouseDown={(e) => e.preventDefault()} onClick={() => void commit(true)}>
            <Icon icon={Check} />
          </Button>
          <Button type="button" variant="secondary" size="icon-sm" aria-label={t.cancel} disabled={pending} onMouseDown={(e) => e.preventDefault()} onClick={() => close(true)}>
            <Icon icon={X} />
          </Button>
        </div>
      </div>
      {invalid ? (
        <p id={errorId} role="alert" className="text-caption text-nq-danger-text">
          {error}
        </p>
      ) : multiline ? (
        <p className="text-caption text-muted-foreground">{t.hintMulti}</p>
      ) : null}
    </div>
  );
}
