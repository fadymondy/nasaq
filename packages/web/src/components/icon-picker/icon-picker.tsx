"use client";

import { type LucideIcon, Search, Shapes } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { ICON_CATALOG, ICON_CATEGORIES, type IconEntry, toKebab } from "./icon-catalog";
import { filterIcons, nextGridIndex, pushRecent } from "./icon-search";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    trigger: "Choose icon",
    chosen: (name: string) => `Icon: ${name}`,
    search: "Search icons",
    all: "All",
    recent: "Recent",
    grid: "Icons",
    empty: (q: string) => `No icons match “${q}”.`,
    showMore: (n: string) => `Show ${n} more`,
    results: (n: string) => `${n} icons`,
    clear: "Clear icon",
    categories: {
      general: "General", files: "Files", communication: "Communication", business: "Business", commerce: "Commerce", data: "Data", people: "People",
      dev: "Developer", media: "Media", design: "Design", nature: "Nature", travel: "Travel", health: "Health and food",
    } as Record<string, string>,
  },
  ar: {
    trigger: "اختيار أيقونة",
    chosen: (name: string) => `الأيقونة: ${name}`,
    search: "ابحث عن أيقونة",
    all: "الكل",
    recent: "الأحدث استخدامًا",
    grid: "الأيقونات",
    empty: (q: string) => `لا توجد أيقونات مطابقة لـ «${q}».`,
    showMore: (n: string) => `عرض ${n} أخرى`,
    results: (n: string) => `${n} أيقونة`,
    clear: "إزالة الأيقونة",
    categories: {
      general: "عام", files: "الملفات", communication: "التواصل", business: "الأعمال", commerce: "التجارة", data: "البيانات", people: "الأشخاص",
      dev: "التطوير", media: "الوسائط", design: "التصميم", nature: "الطبيعة", travel: "السفر", health: "الصحة والطعام",
    } as Record<string, string>,
  },
};
export type IconPickerLabels = Omit<typeof STRINGS.en, "categories"> & { categories: Record<string, string> };

const RECENT_KEY = "nasaq:icon-picker:recent";
const PAGE = 96;

/* ------------------------------------------------------------------ helpers */

/** Accepts the stored forms of an icon name: `users`, `Users`, `lucide:users`. Returns the kebab-case name. */
export function normalizeIconName(name: string): string {
  const bare = name.trim().replace(/^lucide:/, "");
  return /[A-Z]/.test(bare) ? toKebab(bare) : bare;
}

/** Finds an icon component by name in the built-in set (or your own). Accepts `users`, `Users` and `lucide:users`. */
export function findIcon(name: string | null | undefined, icons: readonly IconEntry[] = ICON_CATALOG): IconEntry | undefined {
  if (!name) return undefined;
  const key = normalizeIconName(name);
  return icons.find((i) => i.name === key);
}

const isIconUrl = (name: string) => /^(https?:\/\/|\/|data:image\/)/.test(name);

/**
 * The Boxicons class for a stored name, or `undefined` when it is not a Boxicons name. Accepts the prefixed
 * forms `bx:home`, `bxs:home`, `bxl:github` and the legacy class forms `bx-home`, `bxs-home`, `bxl-github`.
 */
export function boxiconClass(name: string | null | undefined): string | undefined {
  const m = name?.trim().match(/^(bx|bxs|bxl)[:-]([a-z0-9-]+)$/i);
  return m ? `${m[1]!.toLowerCase()}-${m[2]!.toLowerCase()}` : undefined;
}

export type IconByNameProps = {
  /**
   * An icon name (`users`, `Users`, `lucide:users`), a Boxicons name (`bx:home`, `bxl:github`, `bx-home`; needs the
   * Boxicons CSS on the page) or an image URL (`https://…`, `/…`, `data:image/…`).
   */
  name: string | null | undefined;
  icons?: readonly IconEntry[];
  /** Rendered when the name is empty or unknown. Default: nothing. */
  fallback?: ReactNode;
} & React.ComponentProps<LucideIcon>;

/**
 * Renders an icon stored as a string: what a picker returned, or what a server sent (navigation, resources,
 * plugin manifests). An image URL renders as a decorative `<img>` at the same size. Unknown names render `fallback`.
 */
export function IconByName({ name, icons, fallback = null, className, size, ...props }: IconByNameProps) {
  if (name && isIconUrl(name)) {
    const px = typeof size === "number" ? size : undefined;
    return (
      <img
        src={name}
        alt=""
        aria-hidden
        data-slot="icon-image"
        width={px}
        height={px}
        className={cn("inline-block shrink-0 object-contain", px === undefined && "size-4", className as string)}
      />
    );
  }
  const bx = boxiconClass(name);
  if (bx) {
    return (
      <i
        aria-hidden
        data-slot="icon-boxicon"
        className={cn("bx inline-block shrink-0 not-italic", bx, className as string)}
        style={{ fontSize: size ?? "1em", lineHeight: 1 }}
      />
    );
  }
  const Found = findIcon(name, icons)?.icon;
  return Found ? <Found aria-hidden className={className} size={size} {...props} /> : <>{fallback}</>;
}

function useUi() {
  const nq = useOptionalNasaq();
  const locale = nq?.locale ?? "en";
  const isAr = locale.startsWith("ar");
  return { locale, isAr, isRtl: nq?.isRtl ?? isAr, t: STRINGS[isAr ? "ar" : "en"] };
}

function useRecent(controlled: string[] | undefined, onChange: ((r: string[]) => void) | undefined, storageKey: string | null) {
  const [inner, setInner] = useState<string[]>([]);
  useEffect(() => {
    if (!storageKey || controlled) return;
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      if (Array.isArray(raw)) setInner(raw.filter((n): n is string => typeof n === "string"));
    } catch {
      /* Storage is unavailable or holds junk: start empty. */
    }
  }, [storageKey, controlled]);
  const recent = controlled ?? inner;
  const push = (name: string) => {
    const next = pushRecent(recent, name);
    setInner(next);
    onChange?.(next);
    if (storageKey && !controlled) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* Ignore quota or privacy-mode errors. */
      }
    }
  };
  return [recent, push] as const;
}

/* ------------------------------------------------------------------ panel */

export interface IconPickerPanelProps {
  /** The chosen icon's kebab-case name (controlled). */
  value?: string | null;
  defaultValue?: string | null;
  /** Called with the icon's name, for example `"house"` or `"building-2"`. */
  onValueChange?: (name: string, entry: IconEntry) => void;
  /** Your own icons instead of the built-in ~220. */
  icons?: readonly IconEntry[];
  /** Recent icons (controlled). Otherwise they are kept in localStorage. */
  recent?: string[];
  onRecentChange?: (recent: string[]) => void;
  /** localStorage key for recents, or `null` to keep them in memory only. */
  recentKey?: string | null;
  /** Tiles per row. Default 8. */
  columns?: number;
  /** Icons rendered before "Show more". Default 96. */
  pageSize?: number;
  autoFocus?: boolean;
  className?: string;
  labels?: Partial<Omit<IconPickerLabels, "categories">> & { categories?: Record<string, string> };
}

/**
 * The picker itself: search, category chips, recent icons and a keyboard-navigable grid. Renders at most
 * `pageSize` icons at a time, then "Show more". Use `IconPicker` for the popover version.
 */
export function IconPickerPanel({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  icons = ICON_CATALOG,
  recent: recentProp,
  onRecentChange,
  recentKey = RECENT_KEY,
  columns = 8,
  pageSize = PAGE,
  autoFocus,
  className,
  labels,
}: IconPickerPanelProps) {
  const ui = useUi();
  const t = { ...ui.t, ...labels, categories: { ...ui.t.categories, ...labels?.categories } };
  const id = useId();
  const [inner, setInner] = useState(defaultValue);
  const value = valueProp === undefined ? inner : valueProp;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [limit, setLimit] = useState(pageSize);
  const [active, setActive] = useState(0);
  const [recent, pushRecentName] = useRecent(recentProp, onRecentChange, recentKey);
  const gridRef = useRef<HTMLDivElement>(null);
  const n = new Intl.NumberFormat(ui.locale);

  const categories = useMemo(() => {
    const seen = new Set(icons.map((i) => i.category));
    const order = ICON_CATEGORIES.filter((c) => seen.has(c));
    return [...order, ...[...seen].filter((c) => !order.includes(c as never))];
  }, [icons]);

  const matches = useMemo(() => filterIcons(icons, query, category), [icons, query, category]);
  const recentEntries = useMemo(() => recent.map((r) => findIcon(r, icons)).filter((e): e is IconEntry => Boolean(e)), [recent, icons]);
  const showRecent = !query && !category && recentEntries.length > 0;
  const shown = matches.slice(0, limit);

  // A new search or category starts from the top.
  useEffect(() => {
    setLimit(pageSize);
    setActive(0);
  }, [query, category, pageSize]);

  const choose = (entry: IconEntry) => {
    setInner(entry.name);
    pushRecentName(entry.name);
    onValueChange?.(entry.name, entry);
  };

  const focusTile = (index: number) => {
    setActive(index);
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.focus());
  };

  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
    if (!target) return;
    const index = Number(target.dataset.index);
    if (e.key === "ArrowDown" && index + columns >= shown.length && shown.length < matches.length) {
      // Down from the last visible row reveals the next page.
      e.preventDefault();
      setLimit((l) => l + pageSize);
      focusTile(Math.min(index + columns, matches.length - 1));
      return;
    }
    if (e.key === "ArrowUp" && index < columns) {
      e.preventDefault();
      (gridRef.current?.closest("[data-slot=icon-picker]")?.querySelector("input") as HTMLInputElement | null)?.focus();
      return;
    }
    const next = nextGridIndex(e.key, index, shown.length, columns, ui.isRtl);
    if (next !== index && next >= 0) {
      e.preventDefault();
      focusTile(next);
    }
  };

  const tile = (entry: IconEntry, index: number, keyPrefix: string) => {
    const Glyph = entry.icon;
    const selected = value === entry.name;
    return (
      <button
        key={`${keyPrefix}${entry.name}`}
        type="button"
        role="option"
        aria-selected={selected}
        aria-label={entry.name}
        title={entry.name}
        data-index={index}
        data-selected={selected ? "" : undefined}
        tabIndex={index === active ? 0 : -1}
        onClick={() => choose(entry)}
        onFocus={() => setActive(index)}
        className={cn(
          "flex size-9 items-center justify-center rounded-control text-foreground outline-none transition-colors duration-150 ease-nq",
          "hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus data-[selected]:bg-nq-selected data-[selected]:font-medium",
        )}
      >
        <Glyph aria-hidden className="size-5" />
      </button>
    );
  };

  return (
    <div data-slot="icon-picker" className={cn("flex w-80 max-w-full flex-col bg-popover text-popover-foreground", className)}>
      <div className="relative border-b border-border p-2">
        <Search aria-hidden className="pointer-events-none absolute inset-y-0 start-5 my-auto size-4 text-muted-foreground" />
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && shown.length) {
              e.preventDefault();
              focusTile(active < shown.length ? active : 0);
            }
          }}
          aria-label={t.search}
          placeholder={t.search}
          aria-controls={`${id}-grid`}
          className={cn(
            "h-control-sm w-full min-w-0 rounded-control border border-input bg-card ps-8 pe-2 text-body-sm text-foreground outline-none",
            "placeholder:text-muted-foreground focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus",
          )}
        />
      </div>

      <div role="tablist" aria-label={t.grid} className="flex gap-1 overflow-x-auto border-b border-border px-2 py-1.5 [scrollbar-width:none]">
        {[null, ...categories].map((c) => (
          <button
            key={c ?? "all"}
            type="button"
            role="tab"
            aria-selected={category === c}
            onClick={() => setCategory(c)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-caption outline-none transition-colors duration-150 ease-nq",
              "focus-visible:outline-2 focus-visible:outline-nq-focus",
              category === c ? "bg-nq-selected text-foreground font-medium" : "text-muted-foreground hover:bg-nq-hover hover:text-foreground",
            )}
          >
            {c === null ? t.all : (t.categories[c] ?? c)}
          </button>
        ))}
      </div>

      <div className="max-h-64 overflow-y-auto p-2">
        {showRecent ? (
          <div className="mb-2 flex flex-col gap-1" data-slot="icon-picker-recent">
            <div className="px-1 text-caption font-medium text-muted-foreground">{t.recent}</div>
            <div className="flex flex-wrap gap-0.5" role="group" aria-label={t.recent}>
              {recentEntries.map((entry) => {
                const Glyph = entry.icon;
                return (
                  <button
                    key={entry.name}
                    type="button"
                    aria-label={entry.name}
                    title={entry.name}
                    aria-pressed={value === entry.name}
                    onClick={() => choose(entry)}
                    className="flex size-9 items-center justify-center rounded-control text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-pressed:bg-nq-selected"
                  >
                    <Glyph aria-hidden className="size-5" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {matches.length ? (
          <div
            id={`${id}-grid`}
            ref={gridRef}
            role="listbox"
            aria-label={t.grid}
            onKeyDown={onGridKey}
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, justifyItems: "center" }}
          >
            {shown.map((entry, i) => tile(entry, i, ""))}
          </div>
        ) : (
          <p className="px-2 py-8 text-center text-body-sm text-muted-foreground">{t.empty(query)}</p>
        )}

        {shown.length < matches.length ? (
          <div className="mt-2 flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + pageSize)}>
              {t.showMore(n.format(matches.length - shown.length))}
            </Button>
          </div>
        ) : null}
      </div>
      <p role="status" className="sr-only">
        {t.results(n.format(matches.length))}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ popover */

export interface IconPickerProps extends Omit<IconPickerPanelProps, "className" | "autoFocus"> {
  /** The element that opens the picker. Default a button showing the chosen icon. Give a custom trigger an accessible name. */
  trigger?: React.ReactElement;
  /** Close the popover after choosing. Default true. */
  closeOnSelect?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: React.ComponentProps<typeof PopoverContent>["side"];
  align?: React.ComponentProps<typeof PopoverContent>["align"];
  disabled?: boolean;
  className?: string;
}

/** An icon picker in a popover. Choosing an icon calls `onValueChange` with its name (`"house"`) and closes it. */
export function IconPicker({ trigger, closeOnSelect = true, open, onOpenChange, side = "bottom", align = "start", disabled, className, value: valueProp, defaultValue = null, onValueChange, icons = ICON_CATALOG, ...panel }: IconPickerProps) {
  const { t, isRtl } = useUi();
  const [inner, setInner] = useState(false);
  const [innerValue, setInnerValue] = useState(defaultValue);
  const isOpen = open ?? inner;
  const value = valueProp === undefined ? innerValue : valueProp;
  const setOpen = (next: boolean) => {
    setInner(next);
    onOpenChange?.(next);
  };
  const current = findIcon(value, icons);
  const Glyph = current?.icon ?? Shapes;
  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          trigger ?? (
            <Button variant="secondary" size="icon" disabled={disabled} aria-label={current ? t.chosen(current.name) : t.trigger} title={current?.name ?? t.trigger} className={className}>
              <Glyph aria-hidden className={cn(!current && "text-muted-foreground")} />
            </Button>
          )
        }
      />
      <PopoverContent side={side} align={align} dir={isRtl ? "rtl" : "ltr"} className="w-auto overflow-hidden p-0">
        <IconPickerPanel
          {...panel}
          icons={icons}
          value={value}
          autoFocus
          onValueChange={(name, entry) => {
            setInnerValue(name);
            onValueChange?.(name, entry);
            if (closeOnSelect) setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
