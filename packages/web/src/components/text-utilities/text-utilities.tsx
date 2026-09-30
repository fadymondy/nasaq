"use client";

import { Bookmark, ChevronDown, ChevronUp, Languages, RotateCcw } from "lucide-react";
import { type ComponentProps, type ElementType, type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button, type ButtonProps } from "../button";
import { Spinner } from "../spinner";
import { linkifyText, type LinkifyOptions, progressiveRemaining, scrollFadeMask, scrollFadeState } from "./text-utilities-logic";

const STRINGS = {
  en: {
    showTranslation: "Show translation",
    showOriginal: "Show original",
    translating: "Translating",
    translatedFrom: "Translated from {language}",
    originalIn: "Original in {language}",
    translateFailed: "Could not translate this text.",
    retry: "Try again",
    save: "Save",
    saved: "Saved",
    savedAnnounce: "Saved to your bookmarks",
    removedAnnounce: "Removed from your bookmarks",
    saveFailed: "Could not update your bookmarks.",
    showMore: "Show more",
    showLess: "Show less",
    showMoreItems: "Show {count} more",
    left: "{left} left",
    scrollRegion: "Scrollable content",
  },
  ar: {
    showTranslation: "عرض الترجمة",
    showOriginal: "عرض الأصل",
    translating: "جارٍ الترجمة",
    translatedFrom: "مترجم من {language}",
    originalIn: "الأصل بـ{language}",
    translateFailed: "تعذرت ترجمة هذا النص.",
    retry: "حاول مرة أخرى",
    save: "حفظ",
    saved: "محفوظ",
    savedAnnounce: "حُفظ في إشاراتك المرجعية",
    removedAnnounce: "أُزيل من إشاراتك المرجعية",
    saveFailed: "تعذر تحديث إشاراتك المرجعية.",
    showMore: "عرض المزيد",
    showLess: "عرض أقل",
    showMoreItems: "عرض {count} أخرى",
    left: "متبقٍ {left}",
    scrollRegion: "محتوى قابل للتمرير",
  },
};

export type TextUtilitiesLabels = Partial<(typeof STRINGS)["en"]>;

function useStrings(labels?: TextUtilitiesLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  return { ar, locale, t: { ...STRINGS[ar ? "ar" : "en"], ...labels } };
}

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/* --------------------------------------------------------------- Linkify */

export interface LinkifyProps extends Omit<ComponentProps<"span">, "children">, LinkifyOptions {
  /** The plain text to scan. It is never parsed as HTML. */
  children: string;
  /** Classes for each generated link. */
  linkClassName?: string;
  /** Replace how a link renders, for example to use your router. Receives the visible text and the href. */
  renderLink?: (link: { text: string; href: string; kind: "url" | "email" }) => ReactNode;
}

/**
 * Turns the http, https, www and email addresses in plain text into links. Only safe schemes are produced. Each link
 * is isolated and left to right, so a URL keeps its order inside Arabic text.
 */
export function Linkify({ children, emails = true, linkClassName, renderLink, className, ...props }: LinkifyProps) {
  const segments = useMemo(() => linkifyText(children, { emails }), [children, emails]);
  return (
    <span data-slot="linkify" className={className} {...props}>
      {segments.map((seg, i) => {
        if (seg.type === "text") return seg.text;
        if (renderLink) return <bdi key={i}>{renderLink({ text: seg.text, href: seg.href, kind: seg.type })}</bdi>;
        return (
          <bdi key={i} dir="ltr">
            <a
              href={seg.href}
              {...(seg.type === "url" ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" } : {})}
              className={cn("[overflow-wrap:anywhere] text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus", linkClassName)}
            >
              {seg.text}
            </a>
          </bdi>
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------- UserText */

export interface UserTextProps extends Omit<ComponentProps<"span">, "children"> {
  /** Text a person typed: a name, a title, a message. Its direction follows its own first strong letter. */
  children: string;
  /** Render as a block element with its own line box. Default false renders an isolated inline run. */
  block?: boolean;
  /** Clamp to this many lines, with an ellipsis. `title` shows the full text. */
  lines?: number;
  /** Turn URLs and emails into links. */
  linkify?: boolean | LinkifyOptions;
  /** Element to render. Default `span` (or `p` for `block`). */
  as?: ElementType;
}

/**
 * User-provided text that could be in either direction. It is isolated from the surrounding sentence (so an English
 * name never scrambles an Arabic sentence, or the other way round), aligns to the start edge of the layout, and can be
 * clamped to a number of lines and linkified.
 */
export function UserText({ children, block = false, lines, linkify = false, as, className, style, title, ...props }: UserTextProps) {
  const Tag = (as ?? (block ? "p" : "span")) as ElementType;
  const clamped = lines !== undefined && lines > 0;
  return (
    <Tag
      data-slot="user-text"
      dir="auto"
      title={title ?? (clamped ? children : undefined)}
      className={cn("[unicode-bidi:isolate] text-start", block && "block [unicode-bidi:plaintext]", clamped && "overflow-hidden break-words", className)}
      style={clamped ? { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", ...style } : style}
      {...props}
    >
      {linkify ? <Linkify {...(typeof linkify === "object" ? linkify : {})}>{children}</Linkify> : children}
    </Tag>
  );
}

/* ---------------------------------------------------- TranslatableText */

export type TranslateResult = string | { text?: string; error?: string } | void;

export interface TranslatableTextProps extends Omit<ComponentProps<"div">, "children"> {
  /** The text as written. */
  original: string;
  /** A translation you already have. Without it, `onTranslate` is called on the first toggle. */
  translation?: string;
  /** BCP 47 code of the original, for `lang` and the "Translated from" note. */
  sourceLang: string;
  /** BCP 47 code of the translation. Default: the Nasaq locale. */
  targetLang?: string;
  /** Fetch a translation. Resolve with the text, or `{ error }` to show the failure with a retry. */
  onTranslate?: (text: string, target: string) => Promise<TranslateResult>;
  /** Start on the translation. Default false. */
  defaultShowTranslation?: boolean;
  /** Clamp both versions to this many lines. */
  lines?: number;
  linkify?: boolean;
  labels?: TextUtilitiesLabels;
}

function languageName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * A message with a toggle between the original and its translation. The two versions each carry their own `lang` and
 * direction, the translation is fetched once and kept, and failures offer a retry.
 */
export function TranslatableText({ original, translation, sourceLang, targetLang, onTranslate, defaultShowTranslation = false, lines, linkify, labels, className, ...props }: TranslatableTextProps) {
  const { locale, t } = useStrings(labels);
  const target = targetLang ?? locale;
  const [translated, setTranslated] = useState<string | undefined>(translation);
  const [show, setShow] = useState(defaultShowTranslation && translation !== undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => setTranslated(translation), [translation]);

  const load = useCallback(async () => {
    if (!onTranslate) return;
    setPending(true);
    setError(undefined);
    try {
      const result = await onTranslate(original, target);
      if (!alive.current) return;
      const text = typeof result === "string" ? result : result?.text;
      const failure = typeof result === "object" && result ? result.error : undefined;
      if (failure || text === undefined) setError(failure ?? t.translateFailed);
      else {
        setTranslated(text);
        setShow(true);
      }
    } catch {
      if (alive.current) setError(t.translateFailed);
    } finally {
      if (alive.current) setPending(false);
    }
  }, [onTranslate, original, target, t.translateFailed]);

  const toggle = () => {
    if (show) return setShow(false);
    if (translated !== undefined) return setShow(true);
    void load();
  };

  const canToggle = translated !== undefined || Boolean(onTranslate);
  const showingTranslation = show && translated !== undefined;
  return (
    <div data-slot="translatable-text" data-showing={showingTranslation ? "translation" : "original"} className={cn("flex min-w-0 flex-col gap-1.5", className)} {...props}>
      <UserText block lang={showingTranslation ? target : sourceLang} lines={lines} linkify={linkify} className="text-body text-foreground">
        {showingTranslation ? (translated as string) : original}
      </UserText>
      {canToggle ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            aria-pressed={showingTranslation}
            className="inline-flex items-center gap-1.5 rounded-control text-muted-foreground underline decoration-nq-line underline-offset-4 outline-none hover:text-foreground hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-60"
          >
            {pending ? <Spinner className="size-3" /> : <Languages aria-hidden className="size-3.5" />}
            {pending ? t.translating : showingTranslation ? t.showOriginal : t.showTranslation}
          </button>
          <span>{fill(showingTranslation ? t.translatedFrom : t.originalIn, { language: languageName(sourceLang, locale) })}</span>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="flex flex-wrap items-center gap-2 text-caption text-nq-danger-text">
          {error}
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 underline underline-offset-4 outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
            <RotateCcw aria-hidden className="size-3" />
            {t.retry}
          </button>
        </p>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------- ScrollFade */

export interface ScrollFadeProps extends Omit<ComponentProps<"div">, "children"> {
  children: ReactNode;
  /** Width of each fade in px. Default 32. */
  fadeSize?: number;
  /** Accessible name for the scrollable region. Default "Scrollable content". */
  label?: string;
  /** Classes for the inner row that holds the children. */
  contentClassName?: string;
}

/**
 * A horizontally scrolling row that fades out the edge that still has content behind it. It works out the inline start
 * from the layout direction, so in Arabic the first fade is on the right. The region takes keyboard focus while it
 * scrolls, and the fade is a mask, so it needs no background colour.
 */
export function ScrollFade({ children, fadeSize = 32, label, contentClassName, className, ...props }: ScrollFadeProps) {
  const { t } = useStrings();
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ start: false, end: false });
  const [rtl, setRtl] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setRtl(getComputedStyle(el).direction === "rtl");
    const next = scrollFadeState({ scrollStart: Math.abs(el.scrollLeft), clientSize: el.clientWidth, scrollSize: el.scrollWidth });
    setState((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [measure]);

  const scrollable = state.start || state.end;
  const mask = scrollFadeMask(state, fadeSize, rtl);
  return (
    <div
      ref={ref}
      data-slot="scroll-fade"
      data-fade-start={state.start || undefined}
      data-fade-end={state.end || undefined}
      role="region"
      aria-label={label ?? t.scrollRegion}
      tabIndex={scrollable ? 0 : undefined}
      onScroll={measure}
      className={cn("overflow-x-auto overscroll-x-contain outline-none [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&::-webkit-scrollbar]:hidden", className)}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
      {...props}
    >
      <div className={cn("flex w-max min-w-full items-center gap-2", contentClassName)}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------- BookmarkButton */

export interface BookmarkButtonProps extends Omit<ButtonProps, "onClick" | "children" | "value" | "defaultValue"> {
  /** Controlled saved state. Omit it to let the button keep its own. */
  saved?: boolean;
  defaultSaved?: boolean;
  /**
   * Called with the wanted state. The button flips at once and goes back if this rejects or resolves with `{ error }`.
   */
  onSavedChange?: (saved: boolean) => Promise<void | { error?: string }>;
  /** Show the word next to the icon. Default false (icon only). */
  showLabel?: boolean;
  labels?: TextUtilitiesLabels;
}

/** A save or bookmark toggle. It is optimistic, announces the change to screen readers, and reverts with a message on failure. */
export function BookmarkButton({ saved: controlled, defaultSaved = false, onSavedChange, showLabel = false, labels, variant = "ghost", size, className, ...props }: BookmarkButtonProps) {
  const { t } = useStrings(labels);
  const [own, setOwn] = useState(defaultSaved);
  const [optimistic, setOptimistic] = useState<boolean>();
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const saved = optimistic ?? controlled ?? own;

  const click = async () => {
    if (busy.current) return;
    const next = !saved;
    busy.current = true;
    setOptimistic(next);
    setFailed(false);
    setMessage(next ? t.savedAnnounce : t.removedAnnounce);
    try {
      const result = await onSavedChange?.(next);
      if (result && typeof result === "object" && result.error) throw new Error(result.error);
      setOwn(next);
    } catch {
      setFailed(true);
      setMessage(t.saveFailed);
    } finally {
      busy.current = false;
      setOptimistic(undefined);
    }
  };

  const text = saved ? t.saved : t.save;
  return (
    <>
      <Button
        data-slot="bookmark-button"
        data-saved={saved || undefined}
        aria-pressed={saved}
        aria-label={showLabel ? undefined : text}
        variant={variant}
        size={size ?? (showLabel ? "md" : "icon")}
        onClick={click}
        className={cn(saved && "text-primary", className)}
        {...props}
      >
        <Bookmark aria-hidden className={cn(saved && "fill-current")} />
        {showLabel ? text : null}
      </Button>
      <span role="status" className={failed ? "text-caption text-nq-danger-text" : "sr-only"}>
        {message}
      </span>
    </>
  );
}

/* ---------------------------------------------------- ProgressiveReveal */

export interface ProgressiveRevealProps extends Omit<ComponentProps<"div">, "children"> {
  children: ReactNode;
  /** Height in px while collapsed. Default 96. */
  collapsedHeight?: number;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  labels?: TextUtilitiesLabels;
}

/**
 * Long content collapsed to a height with a fade and a "Show more" button. The button only appears when the content is
 * actually taller than the limit, and it drives `aria-expanded` on a real button. Use `ProgressiveList` for lists.
 */
export function ProgressiveReveal({ children, collapsedHeight = 96, expanded: controlled, defaultExpanded = false, onExpandedChange, labels, className, ...props }: ProgressiveRevealProps) {
  const { t } = useStrings(labels);
  const id = useId();
  const [own, setOwn] = useState(defaultExpanded);
  const expanded = controlled ?? own;
  const ref = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > collapsedHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [collapsedHeight, children]);

  const toggle = () => {
    const next = !expanded;
    if (controlled === undefined) setOwn(next);
    onExpandedChange?.(next);
  };
  const mask = overflows && !expanded ? "linear-gradient(to bottom, black calc(100% - 32px), transparent)" : undefined;
  return (
    <div data-slot="progressive-reveal" data-expanded={expanded || undefined} className={cn("flex flex-col items-start gap-2", className)} {...props}>
      <div ref={ref} id={id} className="w-full overflow-hidden" style={{ maxHeight: expanded ? undefined : collapsedHeight, maskImage: mask, WebkitMaskImage: mask }}>
        {children}
      </div>
      {overflows || expanded ? (
        <Button variant="ghost" size="sm" aria-expanded={expanded} aria-controls={id} onClick={toggle}>
          {expanded ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
          {expanded ? t.showLess : t.showMore}
        </Button>
      ) : null}
    </div>
  );
}

export interface ProgressiveListProps extends Omit<ComponentProps<"ul">, "children"> {
  items: readonly ReactNode[];
  /** How many to show at first. Default 3. */
  initial?: number;
  /** How many each press adds. Default 3. */
  step?: number;
  /** Fires with the new visible count. */
  onReveal?: (visible: number) => void;
  labels?: TextUtilitiesLabels;
}

/** A list that shows its first few items and reveals `step` more on each press, with the count left. */
export function ProgressiveList({ items, initial = 3, step = 3, onReveal, labels, className, ...props }: ProgressiveListProps) {
  const { t } = useStrings(labels);
  const [visible, setVisible] = useState(initial);
  const shown = Math.min(visible, items.length);
  const { next, left } = progressiveRemaining(shown, items.length, step);
  return (
    <div data-slot="progressive-list" className="flex flex-col items-start gap-2">
      <ul className={cn("flex w-full flex-col gap-2", className)} {...props}>
        {items.slice(0, shown).map((item, i) => (
          <li key={i} className="min-w-0">
            {item}
          </li>
        ))}
      </ul>
      {left > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const to = shown + next;
            setVisible(to);
            onReveal?.(to);
          }}
        >
          <ChevronDown aria-hidden />
          {fill(t.showMoreItems, { count: next })}
          <span className="text-muted-foreground">{fill(t.left, { left })}</span>
        </Button>
      ) : null}
    </div>
  );
}
