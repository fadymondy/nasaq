"use client";

import { Users } from "lucide-react";
import {
  Fragment,
  type ChangeEvent,
  type ComponentProps,
  type KeyboardEvent,
  type SyntheticEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { normalizeForSearch } from "../commands";
import { Textarea } from "../field";
import { formatNumber } from "../numeric";
import { PresenceDot } from "../profile-card/profile-card";
import type { Presence } from "../profile-card/profile-model";
import { kindOf, type MentionKind, rankOptions } from "./mention-model";

const STRINGS = {
  en: {
    list: "Mentions",
    empty: "No matches",
    count: (n: string) => `${n} suggestions`,
    person: "People",
    team: "Teams",
    group: "Groups",
    teamOne: "Team",
    groupOne: "Group",
  },
  ar: {
    list: "الإشارات",
    empty: "لا نتائج",
    count: (n: string) => `${n} اقتراحات`,
    person: "الأشخاص",
    team: "الفرق",
    group: "المجموعات",
    teamOne: "فريق",
    groupOne: "مجموعة",
  },
};

export interface MentionOption {
  id: string;
  /** Inserted after the trigger and matched by the query. */
  name: string;
  /** Second line in the list, for example an email or a role. */
  description?: string;
  /** Avatar image. Initials are used without it. */
  avatar?: string;
  /** `person` (default), `team` or `group`. The list is sectioned by kind, and teams and groups get a group icon. */
  kind?: MentionKind;
  /** Without the `@`. Also matched by the query, so `sara` finds "Sara Ali". */
  handle?: string;
  /** Shows a presence dot on the avatar. */
  presence?: Presence;
  /** Extra words the query matches (a team's members, an old name). */
  keywords?: readonly string[];
}

export interface Mention {
  id: string;
  name: string;
  /** Index of the trigger character in the text. */
  start: number;
  /** Index after the last character of the name (the range is `text.slice(start, end)`). */
  end: number;
}

export interface MentionTextareaProps extends Omit<ComponentProps<"textarea">, "value" | "defaultValue" | "onChange"> {
  value?: string;
  defaultValue?: string;
  /** Called with the new text and every mention still in it, in text order. */
  onValueChange?: (value: string, mentions: Mention[]) => void;
  /** Mentions of a controlled or initial `value`. Mentions whose text no longer matches are dropped. */
  defaultMentions?: Mention[];
  /** People (or anything mentionable) offered in the list. */
  suggestions: MentionOption[];
  /** The character that opens the list. Default "@". */
  trigger?: string;
  /** Most rows shown in all. Default 8. */
  maxSuggestions?: number;
  /** Listbox name. Default "Mentions" / "الإشارات". */
  listLabel?: string;
  /** Shown when nothing matches. Default "No matches" / "لا نتائج". */
  emptyLabel?: string;
  /** Class of the wrapper (the textarea takes `className`). */
  wrapperClassName?: string;
}

/* ---------------------------------------------------------------- helpers */

const MIRRORED = [
  "direction",
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
] as const;

/** Where the caret is, relative to the textarea's padding box, measured with an off-screen copy of it. */
function caretPoint(el: HTMLTextAreaElement, position: number) {
  const mirror = document.createElement("div");
  const style = getComputedStyle(el);
  for (const prop of MIRRORED) (mirror.style as unknown as Record<string, string>)[prop] = (style as unknown as Record<string, string>)[prop] ?? "";
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.textContent = el.value.slice(0, position);
  const marker = document.createElement("span");
  marker.textContent = el.value.slice(position) || ".";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const line = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.4;
  const point = {
    top: marker.offsetTop + line - el.scrollTop,
    left: marker.offsetLeft - el.scrollLeft,
  };
  document.body.removeChild(mirror);
  return point;
}

interface Active {
  /** Index of the trigger character. */
  start: number;
  /** Caret index. */
  caret: number;
  query: string;
}

/** The mention being typed at the caret: a trigger at the start of a word, followed by non-space characters. */
function findActive(value: string, caret: number, trigger: string): Active | null {
  for (let i = caret - 1; i >= 0; i--) {
    if (value.startsWith(trigger, i)) {
      if (i === 0 || /\s/.test(value[i - 1] as string)) return { start: i, caret, query: value.slice(i + trigger.length, caret) };
      return null;
    }
    if (/\s/.test(value[i] as string)) return null;
  }
  return null;
}

/** Keep mention ranges right after `prev` became `next`: shift the ones after the edit, drop the ones it touched. */
function syncMentions(mentions: Mention[], prev: string, next: string): Mention[] {
  let p = 0;
  const max = Math.min(prev.length, next.length);
  while (p < max && prev[p] === next[p]) p++;
  let s = 0;
  while (s < max - p && prev[prev.length - 1 - s] === next[next.length - 1 - s]) s++;
  const delta = next.length - prev.length;
  const out: Mention[] = [];
  for (const m of mentions) {
    if (m.end <= p) out.push(m);
    else if (m.start >= prev.length - s) out.push({ ...m, start: m.start + delta, end: m.end + delta });
  }
  return out;
}

const validOnly = (mentions: Mention[], value: string, trigger: string) =>
  mentions.filter((m) => value.slice(m.start, m.end) === `${trigger}${m.name}`);

/* -------------------------------------------------------------- component */

/**
 * A Textarea that suggests people when you type the trigger (`@`). Focus stays in the textarea (ARIA combobox with a
 * listbox); choosing a suggestion inserts `@name` and reports it in the `mentions` array. Works inside `Field`.
 */
export function MentionTextarea({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  defaultMentions,
  suggestions,
  trigger = "@",
  maxSuggestions = 8,
  listLabel,
  emptyLabel,
  wrapperClassName,
  className,
  onKeyDown,
  onKeyUp,
  onClick,
  onFocus,
  onBlur,
  ...props
}: MentionTextareaProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const listId = useId();
  const optionId = (index: number) => `${listId}-opt-${index}`;
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pendingCaret = useRef<number | null>(null);

  const controlled = valueProp !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const value = controlled ? valueProp : inner;
  const [rawMentions, setRawMentions] = useState<Mention[]>(defaultMentions ?? []);
  const mentions = useMemo(() => validOnly(rawMentions, value, trigger), [rawMentions, value, trigger]);

  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [point, setPoint] = useState({ top: 0, left: 0 });

  const active = focused ? findActive(value, caret, trigger) : null;
  const shown = active && dismissed !== active.start ? active : null;
  const results = useMemo(() => {
    if (!shown) return [];
    return rankOptions(suggestions, shown.query, normalizeForSearch, maxSuggestions);
  }, [shown, suggestions, maxSuggestions]);
  const sectioned = useMemo(() => new Set(suggestions.map(kindOf)).size > 1, [suggestions]);
  const open = shown !== null && results.length > 0;
  // Escape only silences the mention being typed; the next trigger opens the list again.
  useEffect(() => {
    if (dismissed !== null && !active) setDismissed(null);
  }, [dismissed, active]);
  const activeOption = open ? Math.min(activeIndex, results.length - 1) : -1;

  // Restore the caret after the value we set programmatically has been rendered.
  useLayoutEffect(() => {
    if (pendingCaret.current !== null && ref.current) {
      ref.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
      setCaret(pendingCaret.current);
      pendingCaret.current = null;
    }
  });

  // Anchor the list at the caret.
  const shownStart = shown?.start;
  useLayoutEffect(() => {
    if (shownStart === undefined || !ref.current) return;
    const p = caretPoint(ref.current, shownStart);
    const width = wrapperRef.current?.clientWidth ?? 0;
    setPoint({ top: p.top, left: Math.max(0, Math.min(p.left, width - 256)) });
  }, [shownStart, value]);

  // Keep the highlighted option visible while arrowing.
  useEffect(() => {
    if (activeOption >= 0) document.getElementById(optionId(activeOption))?.scrollIntoView({ block: "nearest" });
    // biome-ignore lint/correctness/useExhaustiveDependencies: optionId is derived from listId
  }, [activeOption]);

  const commit = (next: string, nextMentions: Mention[]) => {
    if (!controlled) setInner(next);
    setRawMentions(nextMentions);
    onValueChange?.(next, nextMentions);
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setCaret(e.target.selectionStart);
    setActiveIndex(0);
    commit(next, validOnly(syncMentions(mentions, value, next), next, trigger));
  };

  const track = (e: SyntheticEvent<HTMLTextAreaElement>) => setCaret(e.currentTarget.selectionStart);

  const select = (option: MentionOption) => {
    if (!shown) return;
    const insert = `${trigger}${option.name}`;
    const next = `${value.slice(0, shown.start)}${insert} ${value.slice(shown.caret)}`;
    const kept = syncMentions(mentions, value, next);
    const mention: Mention = { id: option.id, name: option.name, start: shown.start, end: shown.start + insert.length };
    const all = [...kept, mention].sort((a, b) => a.start - b.start);
    pendingCaret.current = mention.end + 1;
    setActiveIndex(0);
    commit(next, all);
    ref.current?.focus();
  };

  const keyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || !open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((activeOption + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((activeOption - 1 + results.length) % results.length);
    } else if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey && !e.nativeEvent.isComposing) {
      const option = results[activeOption];
      if (option) {
        e.preventDefault();
        select(option);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setDismissed(shown?.start ?? null);
    }
  };

  const count = formatNumber(results.length, locale);

  return (
    <div ref={wrapperRef} data-slot="mention-textarea" className={cn("relative w-full", wrapperClassName)}>
      <Textarea
        ref={ref}
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeOption >= 0 ? optionId(activeOption) : undefined}
        className={className}
        {...props}
        value={value}
        onChange={onChange}
        onKeyDown={keyDown}
        onKeyUp={(e) => {
          onKeyUp?.(e);
          track(e);
        }}
        onClick={(e) => {
          onClick?.(e);
          track(e);
        }}
        onSelect={track}
        onFocus={(e) => {
          onFocus?.(e);
          setFocused(true);
          track(e);
        }}
        onBlur={(e) => {
          onBlur?.(e);
          setFocused(false);
        }}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={listLabel ?? t.list}
          data-slot="mention-list"
          style={{ top: point.top, left: point.left }}
          className="absolute z-50 max-h-56 w-64 max-w-full overflow-y-auto rounded-floating border border-border bg-popover p-1 text-body-sm text-popover-foreground shadow-floating"
          // Keep focus in the textarea while the pointer picks an option.
          onMouseDown={(e) => e.preventDefault()}
        >
          {results.map((option, index) => {
            const kind = kindOf(option);
            const heading = sectioned && (index === 0 || kindOf(results[index - 1] as MentionOption) !== kind);
            return (
              <Fragment key={option.id}>
                {heading ? (
                  <li role="presentation" data-slot="mention-heading" className="px-2 pt-1.5 pb-1 text-caption text-muted-foreground">
                    {t[kind]}
                  </li>
                ) : null}
                <li
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeOption}
                  data-slot="mention-option"
                  data-kind={kind}
                  data-active={index === activeOption ? "" : undefined}
                  className="flex cursor-default items-center gap-2 rounded-control px-2 py-1.5 data-active:bg-nq-selected"
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => select(option)}
                >
                  {kind === "person" ? (
                    <span className="relative inline-flex shrink-0">
                      <Avatar name={option.name} src={option.avatar} size="sm" aria-hidden />
                      {option.presence ? <PresenceDot presence={option.presence} decorative className="absolute -end-0.5 -bottom-0.5 border-2 border-popover" /> : null}
                    </span>
                  ) : (
                    <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-control bg-secondary text-secondary-foreground">
                      <Users className="size-3.5" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-label text-foreground">
                      {option.name}
                      {kind === "person" ? null : <span className="sr-only"> ({kind === "team" ? t.teamOne : t.groupOne})</span>}
                    </span>
                    {option.description ? <span className="truncate text-caption text-muted-foreground">{option.description}</span> : null}
                  </span>
                </li>
              </Fragment>
            );
          })}
        </ul>
      ) : shown && shown.query ? (
        <div
          data-slot="mention-empty"
          style={{ top: point.top, left: point.left }}
          className="absolute z-50 w-64 max-w-full rounded-floating border border-border bg-popover px-3 py-2 text-body-sm text-muted-foreground shadow-floating"
        >
          {emptyLabel ?? t.empty}
        </div>
      ) : null}
      <span role="status" className="sr-only">
        {open ? t.count(count) : shown && shown.query ? (emptyLabel ?? t.empty) : ""}
      </span>
    </div>
  );
}
