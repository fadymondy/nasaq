"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { ChevronRight, CornerDownLeft, LoaderCircle, type LucideIcon, Search } from "lucide-react";
import { type ComponentProps, isValidElement, type ReactNode, useEffect, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useModHotkey, useModKeyLabel, useShortcutKeys } from "../../lib/hotkey";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { useSidebarCollapsed } from "../app-shell";
import {
  type Command,
  COMMAND_SECTIONS,
  type CommandSection,
  DEFAULT_SECTION_LABELS,
  normalizeForSearch,
  scoreCommand,
  sectionOrder,
  useCommandPaletteOpen,
  useCommandRegistry,
  useRegisteredCommands,
} from "../commands";
import { Icon, isolate } from "../icon";
import { Kbd } from "../text";
import { Tooltip } from "../tooltip";

/** @deprecated Register `Command`s with `useRegisterCommands`, or pass `commands`. Kept for static lists. */
export interface CommandItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  keywords?: string[];
  shortcut?: string;
  hint?: ReactNode;
  onSelect?: () => void;
}

/** @deprecated See CommandItem. */
export interface CommandGroup {
  id: string;
  label: string;
  items: CommandItem[];
}

export interface CommandPaletteProps {
  /** Static groups (legacy). They render as their own sections before the registry's. */
  groups?: CommandGroup[];
  /** Extra commands on top of those registered with `useRegisterCommands`. */
  commands?: Command[];
  /** Override section headings, e.g. `{ navigation: "Jump to" }`. Standard ones are localised already. */
  sectionLabels?: Partial<Record<CommandSection | (string & {}), string>>;
  /** Controlled open state. Inside AppShell it defaults to the shell's state, shared with SearchTrigger. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Registers ⌘K / Ctrl+K. */
  hotkey?: boolean;
  placeholder?: string;
  emptyLabel?: string;
  labels?: { title?: string; navigate?: string; select?: string; close?: string; back?: string; searching?: string };
}

interface Section {
  id: string;
  label: string;
  items: Command[];
}

const fromLegacy = (groups: CommandGroup[] = []): Command[] =>
  groups.flatMap((g, gi) =>
    g.items.map((i) => ({
      id: i.id,
      label: i.label,
      icon: i.icon,
      keywords: i.keywords,
      shortcut: i.shortcut,
      bindShortcut: false,
      hint: i.hint,
      perform: i.onSelect,
      section: g.id,
      sectionLabel: g.label,
      sectionOrder: -1 + gi / 100,
    })),
  );

const resolveChildren = (c: Command) => (typeof c.children === "function" ? c.children() : (c.children ?? []));

/** Ranks and groups commands: sections in order, then match quality, then priority, then registration order. */
function arrange(list: Command[], rawQuery: string, labelOf: (c: Command) => string): Section[] {
  const query = normalizeForSearch(rawQuery);
  const ranked = list
    .map((c, index) => ({ c, index, score: query ? scoreCommand(c, query) : c.searchOnly ? 0 : 1 }))
    .filter((r) => r.score > 0)
    .sort((a, b) => sectionOrder(a.c) - sectionOrder(b.c) || b.score - a.score || (b.c.priority ?? 0) - (a.c.priority ?? 0) || a.index - b.index);
  const sections = new Map<string, Section>();
  for (const { c } of ranked) {
    const id = c.section ?? "context";
    if (!sections.has(id)) sections.set(id, { id, label: labelOf(c), items: [] });
    sections.get(id)!.items.push(c);
  }
  return [...sections.values()];
}

/**
 * Spotlight search (Raycast, Linear ⌘K). Reads every command registered in the app with
 * `useRegisterCommands` and every async source from `useRegisterCommandSource`, so products add
 * their own navigation, creation, contextual and AI actions without Nasaq knowing about them.
 * Commands with `children` open a nested page; Backspace on an empty field goes back.
 * Built on Base UI Autocomplete rendered inline in a Dialog.
 */
export function CommandPalette({
  groups,
  commands,
  sectionLabels,
  open: controlledOpen,
  onOpenChange,
  hotkey = true,
  placeholder,
  emptyLabel,
  labels,
}: CommandPaletteProps) {
  const nasaq = useOptionalNasaq();
  const ar = nasaq?.locale.startsWith("ar") ?? false;
  const hasRegistry = useCommandRegistry() !== null;
  const [sharedOpen, setSharedOpen] = useCommandPaletteOpen();
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? (hasRegistry ? sharedOpen : localOpen);
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) (hasRegistry ? setSharedOpen : setLocalOpen)(next);
    onOpenChange?.(next);
  };
  const hintId = useId();
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState<Command[]>([]);
  const [remote, setRemote] = useState<Command[]>([]);
  const [searching, setSearching] = useState(false);
  const { commands: registered, sources } = useRegisteredCommands();

  useModHotkey("k", () => setOpen(!open), hotkey);

  // Every open starts fresh at the root.
  useEffect(() => {
    if (open) return;
    setQuery("");
    setPages([]);
    setRemote([]);
  }, [open]);

  const page = pages.at(-1);
  const trimmed = query.trim();

  // Async sources: debounced, aborted when the query changes, root page only.
  useEffect(() => {
    if (!open || page || sources.length === 0) {
      setSearching(false);
      return;
    }
    const active = sources.filter((s) => trimmed.length >= (s.minQuery ?? 1));
    if (active.length === 0) {
      setRemote([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const wait = Math.max(...active.map((s) => s.debounce ?? 150));
    setSearching(true);
    const timer = setTimeout(async () => {
      const results = await Promise.allSettled(active.map((s) => s.search(trimmed, controller.signal)));
      if (controller.signal.aborted) return;
      setRemote(results.flatMap((r) => (r.status === "fulfilled" ? r.value.map((c) => ({ section: "search", ...c })) : [])));
      setSearching(false);
    }, wait);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [open, page, sources, trimmed]);

  const labelOf = (c: Command) => {
    const id = c.section ?? "context";
    if (sectionLabels?.[id]) return sectionLabels[id]!;
    if ((COMMAND_SECTIONS as readonly string[]).includes(id)) return DEFAULT_SECTION_LABELS[id as CommandSection][ar ? "ar" : "en"];
    return c.sectionLabel ?? id;
  };

  const sections = useMemo(() => {
    if (page) return arrange(resolveChildren(page).map((c) => ({ ...c, section: page.id, sectionLabel: page.label, sectionOrder: 0 })), query, labelOf);
    // Remote results are already matched by their source; keep them whatever the local score.
    const local = arrange([...fromLegacy(groups), ...(commands ?? []), ...registered], query, labelOf);
    const found = remote.length ? arrange(remote.map((c) => ({ ...c, keywords: [...(c.keywords ?? []), query] })), query, labelOf) : [];
    return [...local, ...found].sort((a, b) => sectionOrder(a.items[0]!) - sectionOrder(b.items[0]!));
    // labelOf only changes with locale/sectionLabels, both covered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query, groups, commands, registered, remote, ar, sectionLabels]);

  const run = (c: Command) => {
    if (c.disabled) return;
    if (c.children) {
      setPages((p) => [...p, c]);
      setQuery("");
      return;
    }
    if (!c.keepOpen) setOpen(false);
    c.perform?.();
  };

  const icon = (c: Command) => {
    if (!c.icon) return null;
    if (isValidElement(c.icon)) return <span className="flex size-4 shrink-0 items-center justify-center">{c.icon}</span>;
    const I = c.icon as LucideIcon;
    return <I aria-hidden />;
  };

  return (
    <BaseDialog.Root
      open={open}
      onOpenChange={(next, details) => {
        // Esc on a nested page steps back one level; only Esc at the root closes.
        if (!next && details.reason === "escape-key" && pages.length) {
          details.cancel();
          setPages((p) => p.slice(0, -1));
          setQuery("");
          return;
        }
        setOpen(next);
      }}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-nq-fg/10 transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0 dark:bg-nq-bg/60" />
        <BaseDialog.Viewport className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12dvh]">
          <BaseDialog.Popup
            data-slot="command-palette"
            aria-label={labels?.title ?? (ar ? "لوحة الأوامر" : "Command palette")}
            className={cn(
              "flex max-h-[min(32rem,76dvh)] w-full max-w-xl flex-col overflow-hidden rounded-floating border border-border bg-popover text-popover-foreground outline-none",
              "shadow-floating",
              "transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0",
            )}
          >
            <Autocomplete.Root
              open
              inline
              items={sections}
              filteredItems={sections}
              value={query}
              onValueChange={(v) => setQuery(v)}
              itemToStringValue={(item: unknown) => (item as Command).label}
              autoHighlight="always"
              keepHighlight
            >
              <div className="flex items-center gap-2 border-b border-border px-4">
                {searching ? (
                  <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" />
                ) : (
                  <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                )}
                {pages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPages((all) => all.slice(0, all.indexOf(p) + 1))}
                    className="flex h-6 shrink-0 items-center gap-1 rounded-[4px] bg-nq-selected px-1.5 text-caption font-medium text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
                  >
                    {p.label}
                    <Icon icon={ChevronRight} directional className="size-3 text-muted-foreground" />
                  </button>
                ))}
                <Autocomplete.Input
                  aria-describedby={hintId}
                  placeholder={page ? (ar ? "تصفية…" : "Filter…") : (placeholder ?? (ar ? "ابحث أو نفّذ أمرًا…" : "Search or run a command…"))}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && query === "" && pages.length) {
                      e.preventDefault();
                      setPages((p) => p.slice(0, -1));
                    }
                  }}
                  className="h-12 w-full bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]"
                />
                <BaseDialog.Close className="shrink-0 rounded-[3px] outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                  <Kbd>Esc</Kbd>
                  <span className="sr-only">{labels?.close ?? (ar ? "إغلاق" : "Close")}</span>
                </BaseDialog.Close>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 [scroll-padding-block:0.375rem]">
                <Autocomplete.Empty className="flex min-h-24 items-center justify-center text-body-sm text-muted-foreground empty:hidden">
                  {searching ? (labels?.searching ?? (ar ? "جارٍ البحث…" : "Searching…")) : (emptyLabel ?? (ar ? "لا نتائج" : "No results"))}
                </Autocomplete.Empty>
                <Autocomplete.List>
                  {(section: Section) => (
                    <Autocomplete.Group key={section.id} items={section.items} className="not-last:mb-1.5">
                      <Autocomplete.GroupLabel className={cn("px-2.5 pt-2 pb-1 text-caption font-medium text-muted-foreground", page && "sr-only")}>{section.label}</Autocomplete.GroupLabel>
                      <Autocomplete.Collection>
                        {(item: Command) => (
                          <Autocomplete.Item
                            key={item.id}
                            value={item}
                            disabled={item.disabled}
                            onClick={() => run(item)}
                            className={cn(
                              "group flex h-10 min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-3 rounded-control px-2.5 text-body-sm text-foreground outline-none",
                              "[scroll-margin-block:0.375rem] data-highlighted:bg-nq-selected data-disabled:opacity-50",
                              "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground data-highlighted:[&_svg]:text-foreground",
                            )}
                          >
                            {icon(item)}
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.hint ? <span className="shrink-0 text-caption text-muted-foreground">{item.hint}</span> : null}
                            {item.shortcut ? (
                              <ShortcutKeys shortcut={item.shortcut} />
                            ) : null}
                            {item.children ? <Icon icon={ChevronRight} directional className="size-3.5!" /> : null}
                          </Autocomplete.Item>
                        )}
                      </Autocomplete.Collection>
                    </Autocomplete.Group>
                  )}
                </Autocomplete.List>
              </div>

              <div id={hintId} className="flex items-center gap-4 border-t border-border bg-nq-surface-soft px-4 py-2 text-caption text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd> {labels?.navigate ?? (ar ? "تنقّل" : "Navigate")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Kbd>
                    <CornerDownLeft className="size-3" aria-hidden />
                  </Kbd>{" "}
                  {labels?.select ?? (ar ? "فتح" : "Open")}
                </span>
                {pages.length ? (
                  <span className="flex items-center gap-1.5">
                    <Kbd>⌫</Kbd> {labels?.back ?? (ar ? "رجوع" : "Back")}
                  </span>
                ) : null}
              </div>
            </Autocomplete.Root>
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

export interface SearchTriggerProps extends ComponentProps<"button"> {
  label?: string;
  /** "field" is the sidebar's "Search… ⌘K" box; "icon" is a header button (e.g. on mobile). */
  variant?: "field" | "icon";
}

/**
 * The "Search… ⌘K" field that opens the CommandPalette (shadcn sidebar, Linear). On the
 * collapsed rail, or with `variant="icon"`, it is an icon button with a tooltip.
 */
export function SearchTrigger({ label: labelProp, variant = "field", className, onClick, ...props }: SearchTriggerProps) {
  const [, setPaletteOpen] = useCommandPaletteOpen();
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const label = labelProp ?? (ar ? "بحث…" : "Search…");
  const compact = useSidebarCollapsed() || variant === "icon";
  const mod = useModKeyLabel();
  const button = (
    <button
      type="button"
      data-slot="search-trigger"
      aria-keyshortcuts="Meta+K Control+K"
      aria-label={compact ? label : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setPaletteOpen(true);
      }}
      className={cn(
        "flex h-control min-h-[var(--nq-touch-min,0px)] w-full items-center gap-2 rounded-control border border-border bg-card px-2 text-body-sm text-muted-foreground",
        "transition-colors duration-150 ease-nq outline-none hover:border-nq-line-strong hover:text-foreground",
        "focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4 [&_svg]:shrink-0",
        compact && "size-control justify-center border-transparent bg-transparent px-0 hover:bg-nq-hover",
        className,
      )}
      {...props}
    >
      <Search aria-hidden />
      {compact ? null : (
        <>
          <span className="flex-1 truncate text-start">{label}</span>
          <span className="flex gap-0.5" dir="ltr">
            <Kbd>{mod}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </>
      )}
    </button>
  );
  return compact ? (
    <Tooltip content={`${label} ${isolate(mod === "⌘" ? "⌘K" : `${mod}+K`, "ltr")}`} side={variant === "icon" ? "bottom" : "inline-end"}>
      {button}
    </Tooltip>
  ) : (
    button
  );
}

function ShortcutKeys({ shortcut }: { shortcut: string }) {
  const keys = useShortcutKeys(shortcut);
  return (
    <span className="flex shrink-0 gap-1" dir="ltr">
      {keys.map((k, i) => (
        <Kbd key={`${k}${i}`}>{k}</Kbd>
      ))}
    </span>
  );
}
