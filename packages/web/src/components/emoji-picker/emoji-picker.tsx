"use client";

import { type Emoji, EmojiPicker as Frimousse, type EmojiPickerRootProps, type Locale, type SkinTone } from "frimousse";
import { Search, Smile } from "lucide-react";
import { type ComponentProps, type ReactElement, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";

const STRINGS = {
  en: {
    trigger: "Choose emoji",
    search: "Search emoji",
    loading: "Loading emoji…",
    empty: (q: string) => `No emoji found for “${q}”.`,
    skinTone: "Change skin tone",
  },
  ar: {
    trigger: "اختيار رمز تعبيري",
    search: "ابحث عن رمز تعبيري",
    loading: "جارٍ تحميل الرموز…",
    empty: (q: string) => `لا توجد رموز مطابقة لـ «${q}».`,
    skinTone: "تغيير لون البشرة",
  },
};

/** Locales frimousse can load (Emojibase). Arabic is not one of them, so an Arabic UI falls back to English emoji names and search. */
const DATA_LOCALES = new Set([
  "bn", "da", "de", "en-gb", "en", "es-mx", "es", "et", "fi", "fr", "hi", "hu", "it", "ja", "ko", "lt", "ms", "nb", "nl", "pl", "pt", "ru", "sv", "th", "uk", "vi", "zh-hant", "zh",
]);

/** The emoji-data locale for a UI locale: the locale itself when Emojibase has it, otherwise its base language, otherwise "en". */
export function resolveEmojiLocale(locale: string): Locale {
  const lower = locale.toLowerCase();
  if (DATA_LOCALES.has(lower)) return lower;
  const base = lower.split("-")[0] ?? "en";
  return DATA_LOCALES.has(base) ? base : "en";
}

function useUi() {
  const nq = useOptionalNasaq();
  const locale = nq?.locale ?? "en";
  const isAr = locale.startsWith("ar");
  return { t: STRINGS[isAr ? "ar" : "en"], locale, isRtl: nq?.isRtl ?? isAr };
}

export interface EmojiPickerPanelProps extends Omit<EmojiPickerRootProps, "onEmojiSelect" | "locale"> {
  /** Called with the chosen emoji: `{ emoji: "😀", label: "grinning face" }`. */
  onEmojiSelect?: (emoji: Emoji) => void;
  /** Emoji-data locale. Defaults to the Nasaq locale, falling back to English where Emojibase has no data (Arabic). */
  locale?: Locale;
  /** Override the built-in strings (search placeholder, empty/loading text, skin tone label). */
  labels?: Partial<{ search: string; loading: string; empty: (query: string) => string; skinTone: string }>;
}

/**
 * The picker itself: search field, category headers, a virtualised grid and a skin tone button. Use it inline
 * (a side panel, a composer); use `EmojiPicker` for the popover version. Arrow keys follow the reading direction.
 */
export function EmojiPickerPanel({ className, locale, labels, columns = 8, onEmojiSelect, ...props }: EmojiPickerPanelProps) {
  const ui = useUi();
  const t = { ...ui.t, ...labels };
  const ref = useRef<HTMLDivElement>(null);

  // frimousse moves the active emoji with a document-level key listener that treats ArrowLeft as "previous".
  // In a right-to-left grid the previous cell is on the right, so swap the horizontal arrows before it sees them.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const swapped = new WeakSet<Event>();
    const onKey = (e: KeyboardEvent) => {
      if (swapped.has(e) || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
      if (getComputedStyle(root).direction !== "rtl") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      const copy = new KeyboardEvent("keydown", {
        key: e.key === "ArrowLeft" ? "ArrowRight" : "ArrowLeft",
        bubbles: true,
        cancelable: true,
      });
      swapped.add(copy);
      (e.target ?? root).dispatchEvent(copy);
    };
    root.addEventListener("keydown", onKey, true);
    return () => root.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <Frimousse.Root
      ref={ref}
      data-slot="emoji-picker"
      locale={locale ?? resolveEmojiLocale(ui.locale)}
      columns={columns}
      onEmojiSelect={onEmojiSelect}
      className={cn("isolate flex h-80 w-72 flex-col bg-popover text-popover-foreground", className)}
      {...props}
    >
      <div className="flex items-center gap-2 border-b border-border p-2">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden className="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 text-muted-foreground" />
          <Frimousse.Search
            data-slot="emoji-picker-search"
            aria-label={t.search}
            placeholder={t.search}
            className={cn(
              "h-control-sm w-full min-w-0 rounded-control border border-input bg-card ps-8 pe-2 text-body-sm text-foreground outline-none",
              "placeholder:text-muted-foreground focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus",
            )}
          />
        </div>
        <Frimousse.SkinToneSelector
          data-slot="emoji-picker-skin-tone"
          aria-label={t.skinTone}
          className={cn(
            "inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-body outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
          )}
        />
      </div>
      <Frimousse.Viewport data-slot="emoji-picker-viewport" className="relative flex-1 outline-none">
        <Frimousse.Loading className="absolute inset-0 flex items-center justify-center text-body-sm text-muted-foreground">
          {t.loading}
        </Frimousse.Loading>
        <Frimousse.Empty className="absolute inset-0 flex items-center justify-center px-4 text-center text-body-sm text-muted-foreground">
          {({ search }) => t.empty(search)}
        </Frimousse.Empty>
        <Frimousse.List
          className="select-none pb-1"
          components={{
            CategoryHeader: ({ category, className: c, ...rest }) => (
              <div
                {...rest}
                data-slot="emoji-picker-category"
                className={cn("bg-popover px-3 py-1.5 text-start text-caption font-medium text-muted-foreground", c)}
              >
                {category.label}
              </div>
            ),
            Row: ({ children, className: c, ...rest }) => (
              <div {...rest} data-slot="emoji-picker-row" className={cn("scroll-my-1 px-1.5", c)}>
                {children}
              </div>
            ),
            Emoji: ({ emoji, className: c, ...rest }) => (
              <button
                type="button"
                {...rest}
                data-slot="emoji-picker-emoji"
                className={cn(
                  "flex size-8 items-center justify-center rounded-control text-[20px] leading-none outline-none",
                  "data-[active]:bg-nq-hover data-[active]:outline-2 data-[active]:outline-nq-focus",
                  c,
                )}
              >
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </Frimousse.Viewport>
    </Frimousse.Root>
  );
}

export interface EmojiPickerProps extends Omit<EmojiPickerPanelProps, "children" | "className"> {
  /** The element that opens the picker. Defaults to an icon `Button` with a smile glyph. Give a custom trigger an accessible name. */
  trigger?: ReactElement;
  /** Close the popover after an emoji is chosen. Default true. */
  closeOnSelect?: boolean;
  /** Controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: ComponentProps<typeof PopoverContent>["side"];
  align?: ComponentProps<typeof PopoverContent>["align"];
  /** Extra classes for the picker panel. */
  className?: string;
}

/**
 * An emoji picker in a popover. The trigger opens it; choosing an emoji calls `onEmojiSelect` and closes it.
 * The emoji data is fetched on first open (frimousse, from the Emojibase CDN) and cached locally.
 */
export function EmojiPicker({
  trigger,
  closeOnSelect = true,
  open,
  onOpenChange,
  side = "bottom",
  align = "start",
  onEmojiSelect,
  className,
  ...panel
}: EmojiPickerProps) {
  const { t, isRtl } = useUi();
  const [inner, setInner] = useState(false);
  const isOpen = open ?? inner;
  const setOpen = (next: boolean) => {
    setInner(next);
    onOpenChange?.(next);
  };
  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          trigger ?? (
            <Button variant="ghost" size="icon" aria-label={t.trigger}>
              <Smile />
            </Button>
          )
        }
      />
      <PopoverContent side={side} align={align} dir={isRtl ? "rtl" : "ltr"} className="w-auto overflow-hidden p-0">
        <EmojiPickerPanel
          className={className}
          onEmojiSelect={(emoji) => {
            onEmojiSelect?.(emoji);
            if (closeOnSelect) setOpen(false);
          }}
          {...panel}
        />
      </PopoverContent>
    </Popover>
  );
}

export type EmojiSelection = Emoji;
export type EmojiLocale = Locale;
export type EmojiSkinTone = SkinTone;
