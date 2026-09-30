"use client";

import { Input as BaseInput } from "@base-ui/react/input";
import { X } from "lucide-react";
import {
  type ClipboardEvent,
  type ComponentProps,
  type KeyboardEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { normalizeForSearch } from "../commands";

const STRINGS = {
  en: {
    placeholder: "Type and press Enter",
    remove: (tag: string) => `Remove ${tag}`,
    added: (tag: string) => `${tag} added`,
    removed: (tag: string) => `${tag} removed`,
    duplicate: (tag: string) => `${tag} is already added.`,
    invalid: (tag: string) => `${tag} is not valid.`,
    max: (max: number) => `You can add up to ${max} ${max === 1 ? "tag" : "tags"}.`,
    suggestions: "Suggestions",
  },
  ar: {
    placeholder: "اكتب ثم اضغط Enter",
    remove: (tag: string) => `إزالة ${tag}`,
    added: (tag: string) => `تمت إضافة ${tag}`,
    removed: (tag: string) => `تمت إزالة ${tag}`,
    duplicate: (tag: string) => `${tag} مضاف بالفعل.`,
    invalid: (tag: string) => `${tag} غير صالح.`,
    max: (max: number) => `يمكنك إضافة ${max} وسوم كحد أقصى.`,
    suggestions: "اقتراحات",
  },
};

export interface TagInputProps
  extends Omit<ComponentProps<"div">, "defaultValue" | "onChange" | "children" | "placeholder"> {
  /** Controlled tags. Omit to let the component own them. */
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (tags: string[]) => void;
  /** Most tags allowed. At the limit, new tags are refused with a message. */
  maxTags?: number;
  /**
   * Checks a trimmed tag before it is added. Return `true` to accept, `false` for the generic message,
   * or a string: the (localised) message to show.
   */
  validate?: (tag: string, tags: readonly string[]) => boolean | string;
  /** Called when a tag is refused, with the tag and the reason. */
  onReject?: (tag: string, reason: "duplicate" | "invalid" | "max") => void;
  /** Words offered while typing, filtered with `normalizeForSearch` (case, Arabic diacritics and letter variants). */
  suggestions?: readonly string[];
  /** Also treat these keys as a separator. Default: Enter, "," and the Arabic comma. */
  separators?: readonly string[];
  /** Add the text still in the input when it loses focus. Default true. */
  addOnBlur?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Renders one hidden `<input name=…>` per tag so a native form submits them. */
  name?: string;
  /** Marks the box invalid. Inside a Field with `invalid` this is automatic. */
  invalid?: boolean;
  /** Extra props for the text input, e.g. `id` or `aria-label`. */
  inputProps?: Omit<ComponentProps<typeof BaseInput>, "value" | "onChange" | "disabled">;
}

const DEFAULT_SEPARATORS = ["Enter", ",", "،"];

/**
 * Chips inside an input box. Enter or comma adds the typed text, Backspace on an empty input removes
 * the last chip, and pasting splits on commas and new lines. Works as a Field control.
 */
export function TagInput({
  value,
  defaultValue,
  onValueChange,
  maxTags,
  validate,
  onReject,
  suggestions,
  separators = DEFAULT_SEPARATORS,
  addOnBlur = true,
  placeholder,
  disabled,
  name,
  invalid,
  inputProps,
  className,
  ...props
}: TagInputProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = STRINGS[ar ? "ar" : "en"];
  const [inner, setInner] = useState<readonly string[]>(defaultValue ?? []);
  const controlled = value !== undefined;
  const tags = controlled ? value : inner;
  const latest = useRef(tags);
  latest.current = tags;

  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const commit = useCallback(
    (next: string[]) => {
      latest.current = next;
      if (!controlled) setInner(next);
      onValueChange?.(next);
    },
    [controlled, onValueChange],
  );

  /** Adds each tag in order; returns true when every one was accepted. */
  const addMany = (raw: string[]) => {
    let next = [...latest.current];
    let firstError: string | null = null;
    const added: string[] = [];
    for (const item of raw) {
      const tag = item.trim();
      if (!tag) continue;
      let problem: string | null = null;
      let reason: "duplicate" | "invalid" | "max" | null = null;
      if (maxTags !== undefined && next.length >= maxTags) {
        problem = t.max(maxTags);
        reason = "max";
      } else if (next.some((x) => normalizeForSearch(x) === normalizeForSearch(tag))) {
        problem = t.duplicate(tag);
        reason = "duplicate";
      } else if (validate) {
        const result = validate(tag, next);
        if (result !== true) {
          problem = typeof result === "string" ? result : t.invalid(tag);
          reason = "invalid";
        }
      }
      if (problem && reason) {
        firstError ??= problem;
        onReject?.(tag, reason);
      } else {
        next = [...next, tag];
        added.push(tag);
      }
    }
    if (added.length) {
      commit(next);
      setMessage(added.map(t.added).join(", "));
    }
    setError(firstError);
    return firstError === null;
  };

  const filtered = (() => {
    if (!suggestions?.length) return [];
    const q = normalizeForSearch(text);
    const chosen = new Set(tags.map(normalizeForSearch));
    return suggestions.filter((s) => !chosen.has(normalizeForSearch(s)) && (!q || normalizeForSearch(s).includes(q)));
  })();
  const showList = open && filtered.length > 0 && text.trim() !== "";

  const pick = (s: string) => {
    if (addMany([s])) setText("");
    setOpen(false);
    setActive(-1);
    inputRef.current?.focus();
  };

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    inputProps?.onKeyDown?.(e as never);
    if (e.defaultPrevented || e.nativeEvent.isComposing) return;
    if (showList && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const n = filtered.length;
      setActive((a) => (e.key === "ArrowDown" ? (a + 1) % n : (a - 1 + n) % n));
      return;
    }
    if (e.key === "Escape" && showList) {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "Enter" && showList && active >= 0 && filtered[active]) {
      e.preventDefault();
      pick(filtered[active]);
      return;
    }
    if (separators.includes(e.key) && text.trim()) {
      e.preventDefault();
      if (addMany([text])) setText("");
      setOpen(false);
      setActive(-1);
      return;
    }
    if (separators.includes(e.key) && e.key !== "Enter") {
      // A bare comma is never text.
      e.preventDefault();
      return;
    }
    if (e.key === "Backspace" && text === "" && latest.current.length) {
      const last = latest.current[latest.current.length - 1] as string;
      commit(latest.current.slice(0, -1));
      setMessage(t.removed(last));
      setError(null);
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    inputProps?.onPaste?.(e as never);
    if (e.defaultPrevented) return;
    const pasted = e.clipboardData.getData("text");
    if (!/[,\n\r،]/.test(pasted)) return;
    e.preventDefault();
    addMany(`${text}${pasted}`.split(/[,\n\r،]+/));
    setText("");
  }

  const removeAt = (index: number) => {
    const tag = latest.current[index];
    if (tag === undefined) return;
    commit(latest.current.filter((_, i) => i !== index));
    setMessage(t.removed(tag));
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <div
      data-slot="tag-input"
      data-disabled={disabled || undefined}
      data-invalid={invalid || error ? "" : undefined}
      className={cn("relative w-full", className)}
      {...props}
    >
      <div
        data-slot="tag-input-box"
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "flex min-h-control w-full min-w-0 flex-wrap items-center gap-1.5 rounded-control border border-input bg-card px-2 py-1 text-body text-foreground",
          "min-h-[max(var(--nq-control),var(--nq-touch-min,0px))] transition-colors duration-150 ease-nq",
          "focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus",
          "has-[[data-invalid]]:border-nq-danger has-[[aria-invalid=true]]:border-nq-danger",
          (invalid || error) && "border-nq-danger",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {tags.map((tag, i) => (
          <Badge key={tag} data-slot="tag-input-tag" variant="neutral" className="h-6 gap-0.5 ps-2 pe-0.5 text-body-sm">
            <bdi>{tag}</bdi>
            <button
              type="button"
              disabled={disabled}
              aria-label={t.remove(tag)}
              onClick={(e) => {
                e.stopPropagation();
                removeAt(i);
              }}
              className="inline-flex size-5 items-center justify-center rounded-[3px] text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
            >
              <X aria-hidden className="size-3" />
            </button>
          </Badge>
        ))}
        <BaseInput
          ref={inputRef}
          data-slot="tag-input-field"
          value={text}
          disabled={disabled}
          placeholder={tags.length ? undefined : (placeholder ?? t.placeholder)}
          role={suggestions ? "combobox" : undefined}
          aria-expanded={suggestions ? showList : undefined}
          aria-controls={suggestions ? listId : undefined}
          aria-autocomplete={suggestions ? "list" : undefined}
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          className="h-7 min-w-24 flex-1 border-0 bg-transparent px-1 text-body outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]"
          {...inputProps}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
            if (error) setError(null);
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onFocus={(e) => {
            inputProps?.onFocus?.(e);
            setOpen(true);
          }}
          onBlur={(e) => {
            inputProps?.onBlur?.(e);
            setOpen(false);
            if (addOnBlur && text.trim() && addMany([text])) setText("");
          }}
        />
      </div>
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t.suggestions}
          data-slot="tag-input-suggestions"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-floating border border-border bg-popover p-1 text-popover-foreground"
        >
          {filtered.map((s, i) => (
            <li
              key={s}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              data-active={i === active || undefined}
              // mousedown keeps focus in the input, so blur does not close the list before the click lands.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              className="cursor-pointer rounded-control px-2 py-1.5 text-body-sm data-active:bg-nq-hover hover:bg-nq-hover"
            >
              <bdi>{s}</bdi>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p role="alert" data-slot="tag-input-error" className="mt-1.5 text-caption text-nq-danger-text">
          {error}
        </p>
      ) : null}
      <span role="status" aria-live="polite" className="sr-only">
        {message}
      </span>
      {name ? tags.map((tag) => <input key={tag} type="hidden" name={name} value={tag} />) : null}
    </div>
  );
}
