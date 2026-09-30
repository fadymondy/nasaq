"use client";

import { Check, CircleAlert, Search, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { normalizeForSearch } from "../commands";
import { Input } from "../field";
import { formatNumber } from "../numeric";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../select";

const STRINGS = {
  en: {
    title: "Settings",
    description: "Manage your workspace, grouped by topic.",
    nav: "Settings sections",
    search: "Search settings…",
    searchLabel: "Search settings",
    clear: "Clear search",
    results: (n: string) => (n === "1" ? "1 result" : `${n} results`),
    noResults: "No settings match",
    unsaved: (n: string) => (n === "1" ? "1 unsaved change" : `${n} unsaved changes`),
    unsavedSome: "You have unsaved changes",
    save: "Save changes",
    discard: "Discard",
    saving: "Saving…",
    saved: "All changes saved",
    failed: "Could not save your changes. Try again.",
    section: "Section",
  },
  ar: {
    title: "الإعدادات",
    description: "أدِر مساحة عملك، مجمّعة حسب الموضوع.",
    nav: "أقسام الإعدادات",
    search: "ابحث في الإعدادات…",
    searchLabel: "البحث في الإعدادات",
    clear: "مسح البحث",
    results: (n: string) => (n === "1" ? "نتيجة واحدة" : `${n} نتائج`),
    noResults: "لا توجد إعدادات مطابقة",
    unsaved: (n: string) => (n === "1" ? "تغيير واحد غير محفوظ" : `${n} تغييرات غير محفوظة`),
    unsavedSome: "لديك تغييرات غير محفوظة",
    save: "حفظ التغييرات",
    discard: "تجاهل",
    saving: "جارٍ الحفظ…",
    saved: "تم حفظ كل التغييرات",
    failed: "تعذّر حفظ تغييراتك. حاول مرة أخرى.",
    section: "القسم",
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type SettingsSectionsLabels = Partial<typeof STRINGS.en>;

/** One individual setting inside a section. Listing it makes search find it. */
export interface SettingsEntry {
  /** Matches `data-setting-id` on the element in your content, so the page scrolls to it. */
  id: string;
  label: string;
  description?: string;
  keywords?: readonly string[];
}

export interface SettingsPage {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  /** Extra words that find this page. */
  keywords?: readonly string[];
  /** The individual settings on the page, for search. */
  entries?: readonly SettingsEntry[];
  tone?: "default" | "danger";
  /** The page content, usually `SettingsSection` blocks. Mounted on first visit and kept, so unsaved edits survive a switch. */
  content: ReactNode;
}

export interface SettingsGroup {
  id: string;
  label: string;
  pages: readonly SettingsPage[];
}

export interface SettingsSaveResult {
  error?: string;
}

export interface SettingsSectionsProps extends Omit<ComponentProps<"div">, "title" | "onChange"> {
  groups: readonly SettingsGroup[];
  /** The active page id. Controlled. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  title?: ReactNode;
  /** Pass `null` to hide. */
  description?: ReactNode | null;
  /** How many changes are unsaved: a number, or `true` when you do not count. 0 or false hides the save bar. */
  dirty?: number | boolean;
  /** Save everything. Return `{ error }` or throw to keep the bar open with the message. */
  onSave?: () => Promise<void | SettingsSaveResult> | void | SettingsSaveResult;
  /** Discard every unsaved change. */
  onDiscard?: () => void | Promise<void>;
  /** Hide the search box. */
  searchable?: boolean;
  labels?: SettingsSectionsLabels;
}

interface Hit {
  key: string;
  pageId: string;
  entryId?: string;
  title: string;
  description?: string;
  path: string;
}

/* ------------------------------------------------------------------ SettingRow */

export interface SettingRowProps extends Omit<ComponentProps<"div">, "id"> {
  /** Matches `SettingsEntry.id`, so search can scroll here. */
  id: string;
  label: ReactNode;
  description?: ReactNode;
  /** The control, at the inline end (a Switch, a Select, a button). */
  children?: ReactNode;
}

/** A settings line: label and hint on one side, the control on the other. Stacks on narrow screens. */
export function SettingRow({ id, label, description, children, className, ...props }: SettingRowProps) {
  return (
    <div
      data-slot="setting-row"
      data-setting-id={id}
      className={cn(
        "flex flex-col gap-2 rounded-control py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        "data-[highlight=true]:bg-nq-selected data-[highlight=true]:outline-2 data-[highlight=true]:outline-offset-4 data-[highlight=true]:outline-nq-focus",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-label text-foreground">{label}</span>
        {description ? <span className="text-body-sm text-muted-foreground">{description}</span> : null}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2 sm:max-w-[50%]">{children}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ SettingsSections */

const navItem = [
  "flex h-nav-row w-full min-h-[var(--nq-touch-min,0px)] items-center gap-2.5 rounded-control px-3 text-start text-body-sm text-muted-foreground outline-none",
  "transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
  "data-[active=true]:bg-nq-selected data-[active=true]:font-medium data-[active=true]:text-foreground",
  "[&_svg]:size-4 [&_svg]:shrink-0",
].join(" ");

/**
 * A settings page with grouped sections. A nav on the side (a select on narrow screens), a search that finds
 * individual settings across every page, and a save bar that sticks to the bottom while anything is unsaved.
 * It does not own your values: track them yourself, pass `dirty`, and handle `onSave` and `onDiscard`.
 */
export function SettingsSections({
  groups,
  value,
  defaultValue,
  onValueChange,
  title,
  description,
  dirty = 0,
  onSave,
  onDiscard,
  searchable = true,
  labels,
  className,
  ...props
}: SettingsSectionsProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const pages = useMemo(() => groups.flatMap((g) => g.pages.map((p) => ({ ...p, group: g }))), [groups]);
  const [inner, setInner] = useState(defaultValue ?? pages[0]?.id ?? "");
  const activeId = value ?? inner;
  const active = pages.find((p) => p.id === activeId) ?? pages[0];
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set(active ? [active.id] : []));
  const contentId = useId();
  const searchId = useId();
  const [query, setQuery] = useState("");
  const pending = useRef<string | null>(null);

  const select = (id: string, entryId?: string) => {
    if (value === undefined) setInner(id);
    setVisited((cur) => (cur.has(id) ? cur : new Set(cur).add(id)));
    onValueChange?.(id);
    pending.current = entryId ?? null;
  };
  useEffect(() => {
    if (active) setVisited((cur) => (cur.has(active.id) ? cur : new Set(cur).add(active.id)));
  }, [active]);

  // After a search hit, scroll to the setting and flash it.
  useEffect(() => {
    const entryId = pending.current;
    if (!entryId) return;
    pending.current = null;
    const frame = requestAnimationFrame(() => {
      const el = document.getElementById(contentId)?.querySelector<HTMLElement>(`[data-setting-id="${CSS.escape(entryId)}"]`);
      if (!el) return;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.setAttribute("data-highlight", "true");
      el.querySelector<HTMLElement>("input,button,select,textarea,[role=switch],[role=combobox]")?.focus({ preventScroll: true });
      setTimeout(() => el.removeAttribute("data-highlight"), 2200);
    });
    return () => cancelAnimationFrame(frame);
  });

  const q = normalizeForSearch(query);
  const hits = useMemo<Hit[]>(() => {
    if (!q) return [];
    const out: Hit[] = [];
    for (const page of pages) {
      const pageHay = normalizeForSearch([page.label, page.description, page.group.label, ...(page.keywords ?? [])].filter(Boolean).join(" "));
      if (pageHay.includes(q)) out.push({ key: page.id, pageId: page.id, title: page.label, description: page.description, path: page.group.label });
      for (const entry of page.entries ?? []) {
        const hay = normalizeForSearch([entry.label, entry.description, ...(entry.keywords ?? [])].filter(Boolean).join(" "));
        if (hay.includes(q)) out.push({ key: `${page.id}:${entry.id}`, pageId: page.id, entryId: entry.id, title: entry.label, description: entry.description, path: `${page.group.label} › ${page.label}` });
      }
    }
    return out;
  }, [q, pages]);

  /* ---- save bar */
  const count = typeof dirty === "number" ? dirty : dirty ? 1 : 0;
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | undefined>();
  useEffect(() => {
    if (status !== "saved") return;
    const timer = setTimeout(() => setStatus("idle"), 2500);
    return () => clearTimeout(timer);
  }, [status]);
  useEffect(() => {
    if (count > 0 && status === "saved") setStatus("idle");
  }, [count, status]);

  const save = async () => {
    setStatus("saving");
    setError(undefined);
    try {
      const result = await onSave?.();
      if (result && typeof result === "object" && result.error) {
        setError(result.error);
        setStatus("error");
      } else setStatus("saved");
    } catch {
      setError(undefined);
      setStatus("error");
    }
  };
  const discard = async () => {
    await onDiscard?.();
    setStatus("idle");
    setError(undefined);
  };
  const barVisible = count > 0 || status === "saved" || status === "saving";
  const dirtyText = typeof dirty === "number" ? t.unsaved(formatNumber(dirty, locale)) : t.unsavedSome;

  return (
    <div data-slot="settings-sections" className={cn("mx-auto flex w-full max-w-6xl flex-col gap-6", className)} {...props}>
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-foreground">{title ?? t.title}</h1>
        {description === null ? null : <p className="text-body text-muted-foreground">{description ?? t.description}</p>}
      </header>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[16rem_minmax(0,1fr)] md:items-start md:gap-10">
        <div data-slot="settings-sections-nav" className="flex min-w-0 flex-col gap-3 md:sticky md:top-4">
          {searchable ? (
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={searchId}
                type="search"
                value={query}
                aria-label={t.searchLabel}
                placeholder={t.search}
                autoComplete="off"
                onChange={(e) => setQuery(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && query) {
                    e.stopPropagation();
                    setQuery("");
                  }
                }}
                className="ps-8 pe-8 text-body-sm [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  aria-label={t.clear}
                  onClick={() => setQuery("")}
                  className="absolute end-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-control text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}

          {q ? (
            <div data-slot="settings-sections-results" className="flex flex-col gap-1">
              <p role="status" className="px-1 text-caption text-muted-foreground">
                {hits.length ? t.results(formatNumber(hits.length, locale)) : t.noResults}
              </p>
              <ul className="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto">
                {hits.map((hit) => (
                  <li key={hit.key}>
                    <button
                      type="button"
                      onClick={() => {
                        select(hit.pageId, hit.entryId);
                        setQuery("");
                      }}
                      className="flex w-full flex-col items-start gap-0.5 rounded-control px-3 py-2 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
                    >
                      <span className="text-body-sm font-medium text-foreground">{hit.title}</span>
                      <span className="text-caption text-muted-foreground">{hit.path}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div className="md:hidden">
                <Select
                  value={active?.id}
                  items={pages.map((p) => ({ value: p.id, label: p.label }))}
                  onValueChange={(next) => next && select(String(next))}
                >
                  <SelectTrigger aria-label={t.section}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectGroup key={group.id}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.pages.map((page) => (
                          <SelectItem key={page.id} value={page.id}>
                            {page.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <nav aria-label={t.nav} className="hidden flex-col gap-4 md:flex">
                {groups.map((group) => (
                  <div key={group.id} role="group" aria-labelledby={`${contentId}-${group.id}`} className="flex flex-col gap-0.5">
                    <div id={`${contentId}-${group.id}`} className="px-3 pb-1 text-caption font-medium text-muted-foreground">
                      {group.label}
                    </div>
                    {group.pages.map((page) => {
                      const current = page.id === active?.id;
                      return (
                        <button
                          key={page.id}
                          type="button"
                          data-active={current}
                          aria-current={current ? "page" : undefined}
                          aria-controls={`${contentId}-${page.id}`}
                          title={page.description}
                          className={cn(navItem, page.tone === "danger" && "text-nq-danger-text hover:text-nq-danger-text data-[active=true]:text-nq-danger-text")}
                          onClick={() => select(page.id)}
                        >
                          {page.icon}
                          <span className="min-w-0 flex-1 truncate">{page.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </>
          )}
        </div>

        <div id={contentId} data-slot="settings-sections-content" className="flex min-w-0 flex-col gap-6">
          {pages.map((page) =>
            visited.has(page.id) ? (
              <div
                key={page.id}
                id={`${contentId}-${page.id}`}
                role="region"
                aria-label={page.label}
                hidden={page.id !== active?.id}
                data-section={page.id}
                className="flex min-w-0 flex-col gap-6"
              >
                {page.content}
              </div>
            ) : null,
          )}

          <div
            data-slot="settings-save-bar"
            data-state={status}
            hidden={!barVisible && status !== "error"}
            className={cn(
              "sticky bottom-4 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-floating border bg-card px-4 py-3 shadow-floating",
              status === "error" ? "border-nq-danger/50" : "border-border",
            )}
          >
            <div role="status" aria-live="polite" className="flex min-w-0 flex-1 items-center gap-2 text-body-sm">
              {status === "saved" ? (
                <>
                  <Check aria-hidden className="size-4 shrink-0 text-nq-success-text" />
                  <span className="text-foreground">{t.saved}</span>
                </>
              ) : status === "error" ? (
                <>
                  <CircleAlert aria-hidden className="size-4 shrink-0 text-nq-danger-text" />
                  <span className="text-nq-danger-text">{error ?? t.failed}</span>
                </>
              ) : status === "saving" ? (
                <span className="text-muted-foreground">{t.saving}</span>
              ) : (
                <>
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-nq-accent" />
                  <span className="text-foreground">{dirtyText}</span>
                </>
              )}
            </div>
            {status !== "saved" ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={discard} disabled={status === "saving"}>
                  {t.discard}
                </Button>
                <Button variant="primary" onClick={save} loading={status === "saving"}>
                  {t.save}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
