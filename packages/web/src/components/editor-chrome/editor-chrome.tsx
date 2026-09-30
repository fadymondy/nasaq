"use client";

import { useDirection } from "@base-ui/react/direction-provider";
import { AlertCircle, Check, CloudOff, FileText, Link2, Plus, X } from "lucide-react";
import { type ComponentProps, type KeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { type ContextMenuAction, ContextMenuActions } from "../context-menu";
import { Icon } from "../icon";
import { formatNumber } from "../numeric";
import { Spinner } from "../spinner";
import { type EditorSaveState, type EditorTab, editorSaveNeedsAttention, editorTabKeyTarget } from "./editor-chrome-model";

const STRINGS = {
  en: {
    openDocuments: "Open documents",
    untitled: "Untitled",
    close: "Close {title}",
    unsaved: "Unsaved changes",
    newTab: "New document",
    closeTab: "Close",
    closeOthers: "Close others",
    closeAll: "Close all",
    pin: "Pin",
    unpin: "Unpin",
    line: "Ln {n}",
    column: "Col {n}",
    words: "{n} words",
    characters: "{n} characters",
    selected: "{n} selected",
    saved: "Saved",
    saving: "Saving",
    dirty: "Unsaved changes",
    error: "Could not save",
    offline: "Offline, kept on this device",
    retry: "Retry",
    statusBar: "Editor status",
    backlinks: "Backlinks",
    related: "Related",
    noBacklinks: "Nothing links here yet.",
    noRelated: "No related documents.",
    panel: "Links and related documents",
  },
  ar: {
    openDocuments: "المستندات المفتوحة",
    untitled: "بلا عنوان",
    close: "إغلاق {title}",
    unsaved: "تغييرات غير محفوظة",
    newTab: "مستند جديد",
    closeTab: "إغلاق",
    closeOthers: "إغلاق الآخرين",
    closeAll: "إغلاق الكل",
    pin: "تثبيت",
    unpin: "إلغاء التثبيت",
    line: "سطر {n}",
    column: "عمود {n}",
    words: "{n} كلمة",
    characters: "{n} حرف",
    selected: "{n} محددة",
    saved: "تم الحفظ",
    saving: "جارٍ الحفظ",
    dirty: "تغييرات غير محفوظة",
    error: "تعذر الحفظ",
    offline: "دون اتصال، محفوظ على هذا الجهاز",
    retry: "إعادة المحاولة",
    statusBar: "حالة المحرر",
    backlinks: "الروابط الواردة",
    related: "ذات صلة",
    noBacklinks: "لا شيء يشير إلى هنا بعد.",
    noRelated: "لا مستندات ذات صلة.",
    panel: "الروابط والمستندات ذات الصلة",
  },
};

export type EditorChromeLabels = Partial<(typeof STRINGS)["en"]>;

function useChromeStrings(labels?: EditorChromeLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const lang = locale.startsWith("ar") ? "ar" : "en";
  return { locale, t: { ...STRINGS[lang], ...labels } };
}

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/* ------------------------------------------------------------------ tabs */

export interface EditorTabsProps extends Omit<ComponentProps<"div">, "onSelect" | "children"> {
  tabs: EditorTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  /** Close a tab (its x, middle-click, or Delete on the focused tab). Omit to make tabs permanent. */
  onClose?: (id: string) => void;
  /** Adds the "+" button. */
  onNew?: () => void;
  /** Extra tab actions in the context menu (Shift+F10 too), after the built-in ones. */
  tabActions?: (tab: EditorTab) => ContextMenuAction[];
  onCloseOthers?: (id: string) => void;
  onCloseAll?: () => void;
  onPin?: (id: string, pinned: boolean) => void;
  labels?: EditorChromeLabels;
}

/**
 * The strip of open documents above an editor. It is a tablist: arrow keys (mirrored in RTL) and Home/End move between
 * tabs, Delete or middle-click closes, an unsaved tab shows a dot with a screen-reader label, the active tab scrolls into
 * view, and every tab has a context menu.
 */
export function EditorTabs({ tabs, activeId, onSelect, onClose, onNew, tabActions, onCloseOthers, onCloseAll, onPin, labels, className, ...props }: EditorTabsProps) {
  const { t } = useChromeStrings(labels);
  const dir = useDirection() === "rtl" ? "rtl" : "ltr";
  const listRef = useRef<HTMLDivElement>(null);
  const ids = useMemo(() => tabs.map((x) => x.id), [tabs]);

  useEffect(() => {
    const el = activeId ? listRef.current?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(activeId)}"]`) : null;
    el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [activeId, tabs.length]);

  const focusTab = (id: string) => {
    onSelect(id);
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(id)}"]`)?.focus());
  };
  const onKeyDown = (tab: EditorTab) => (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Delete" && onClose) {
      event.preventDefault();
      onClose(tab.id);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(tab.id);
      return;
    }
    const target = editorTabKeyTarget(ids, tab.id, event.key, dir);
    if (target) {
      event.preventDefault();
      focusTab(target);
    }
  };
  const actionsFor = (tab: EditorTab): ContextMenuAction[] => [
    ...(onClose ? [{ id: "close", label: t.closeTab, icon: X, onSelect: () => onClose(tab.id) }] : []),
    ...(onCloseOthers && tabs.length > 1 ? [{ id: "others", label: t.closeOthers, onSelect: () => onCloseOthers(tab.id) }] : []),
    ...(onCloseAll ? [{ id: "all", label: t.closeAll, onSelect: () => onCloseAll() }] : []),
    ...(onPin ? [{ id: "pin", label: tab.pinned ? t.unpin : t.pin, group: "pin", onSelect: () => onPin(tab.id, !tab.pinned) }] : []),
    ...(tabActions?.(tab).map((a) => ({ ...a, group: a.group ?? "more" })) ?? []),
  ];

  return (
    <div data-slot="editor-tabs" className={cn("flex items-stretch border-b border-border bg-nq-surface-soft", className)} {...props}>
      <div ref={listRef} role="tablist" aria-label={t.openDocuments} className="flex min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:thin]">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          const title = tab.title || t.untitled;
          return (
            <ContextMenuActions
              key={tab.id}
              actions={actionsFor(tab)}
              render={
                <div
                  role="tab"
                  data-tab-id={tab.id}
                  data-active={active || undefined}
                  data-dirty={tab.dirty || undefined}
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  title={tab.path ?? title}
                  onClick={() => onSelect(tab.id)}
                  onKeyDown={onKeyDown(tab)}
                  onAuxClick={(e) => {
                    if (e.button === 1 && onClose) {
                      e.preventDefault();
                      onClose(tab.id);
                    }
                  }}
                  className={cn(
                    "group/tab relative flex h-row max-w-56 min-w-24 shrink-0 cursor-default items-center gap-1.5 border-e border-border ps-3 pe-1 text-body-sm outline-none transition-colors duration-150 ease-nq",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
                    active ? "bg-background text-foreground" : "text-muted-foreground hover:bg-nq-hover hover:text-foreground",
                  )}
                />
              }
            >
              {active ? <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary" /> : null}
              <Icon icon={FileText} className="size-3.5 shrink-0 opacity-70" />
              <span dir="auto" className={cn("min-w-0 flex-1 truncate text-start", tab.pinned && "font-medium")}>
                {title}
              </span>
              {tab.dirty ? (
                <>
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-nq-accent" />
                  <span className="sr-only">{t.unsaved}</span>
                </>
              ) : null}
              {onClose && !tab.pinned ? (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={fill(t.close, { title })}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab.id);
                  }}
                  className="inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground pointer-coarse:size-7"
                >
                  <Icon icon={X} className="size-3" />
                </button>
              ) : null}
            </ContextMenuActions>
          );
        })}
      </div>
      {onNew ? (
        <Button variant="ghost" size="icon-sm" aria-label={t.newTab} onClick={onNew} className="m-1 shrink-0">
          <Icon icon={Plus} />
        </Button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ status bar */

export interface EditorStatusBarProps extends Omit<ComponentProps<"div">, "children"> {
  words?: number;
  characters?: number;
  /** 1-based caret position. */
  line?: number;
  column?: number;
  /** Characters selected. Shown only when above zero. */
  selection?: number;
  saveState?: EditorSaveState;
  /** Called by the "Retry" button shown for the error state. */
  onRetry?: () => void;
  /** Extra items at the inline start, e.g. the language or an encoding. */
  items?: ReactNode;
  /** Extra items at the inline end, before the save state. */
  trailing?: ReactNode;
  labels?: EditorChromeLabels;
}

function SaveIcon({ state }: { state: EditorSaveState }) {
  if (state === "saving") return <Spinner className="size-3" />;
  if (state === "dirty") return <span aria-hidden className="size-2 rounded-full bg-nq-accent" />;
  return <Icon icon={state === "saved" ? Check : state === "error" ? AlertCircle : CloudOff} className="size-3" />;
}

/** The strip under an editor: cursor, words and characters, and a save state announced politely (an error is announced at once). */
export function EditorStatusBar({ words, characters, line, column, selection, saveState, onRetry, items, trailing, labels, className, ...props }: EditorStatusBarProps) {
  const { t, locale } = useChromeStrings(labels);
  const n = (v: number) => formatNumber(v, locale);
  return (
    <div
      data-slot="editor-status-bar"
      role="group"
      aria-label={t.statusBar}
      className={cn("flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border bg-nq-surface-soft px-3 py-1 text-caption text-muted-foreground", className)}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {line !== undefined ? (
          <span className="tabular-nums">
            {fill(t.line, { n: n(line) })}
            {column !== undefined ? `, ${fill(t.column, { n: n(column) })}` : ""}
          </span>
        ) : null}
        {selection ? <span className="tabular-nums">{fill(t.selected, { n: n(selection) })}</span> : null}
        {words !== undefined ? <span className="tabular-nums">{fill(t.words, { n: n(words) })}</span> : null}
        {characters !== undefined ? <span className="tabular-nums">{fill(t.characters, { n: n(characters) })}</span> : null}
        {items}
      </div>
      <div className="flex items-center gap-x-4">
        {trailing}
        {saveState ? (
          <span
            data-slot="editor-save-state"
            data-state={saveState}
            role={editorSaveNeedsAttention(saveState) ? "alert" : "status"}
            className={cn("inline-flex items-center gap-1.5", saveState === "error" && "text-nq-danger-text", saveState === "offline" && "text-nq-warning-text")}
          >
            <SaveIcon state={saveState} />
            {t[saveState]}
            {saveState === "error" && onRetry ? (
              <button type="button" onClick={onRetry} className="rounded-[2px] text-foreground underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                {t.retry}
              </button>
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ backlinks */

export interface EditorLink {
  id: string;
  title: string;
  /** The line that mentions the current document, or a summary for related ones. */
  snippet?: string;
  /** Folder or notebook, shown small. */
  path?: string;
  href?: string;
}

export interface EditorBacklinksProps extends Omit<ComponentProps<"aside">, "children"> {
  /** Documents that link to this one. */
  backlinks: EditorLink[];
  /** Documents that are related by topic or tags. */
  related?: EditorLink[];
  onOpen?: (link: EditorLink) => void;
  /** Word in a snippet to emphasise, usually the current title. */
  highlight?: string;
  labels?: EditorChromeLabels;
}

function Snippet({ text, term }: { text: string; term?: string }) {
  if (!term) return <>{text}</>;
  const i = text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[2px] bg-nq-selected px-0.5 text-foreground">{text.slice(i, i + term.length)}</mark>
      {text.slice(i + term.length)}
    </>
  );
}

function LinkList({ heading, links, empty, onOpen, highlight, locale }: { heading: string; links: EditorLink[]; empty: string; onOpen?: (l: EditorLink) => void; highlight?: string; locale: string }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h3 id={id} className="eyebrow flex items-center justify-between">
        {heading}
        <span className="tabular-nums">{formatNumber(links.length, locale)}</span>
      </h3>
      {links.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {links.map((link) => (
            <li key={link.id}>
              <a
                href={link.href ?? `#${link.id}`}
                onClick={(e) => {
                  if (onOpen) {
                    e.preventDefault();
                    onOpen(link);
                  }
                }}
                className="flex flex-col gap-0.5 rounded-control p-2 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
              >
                <span dir="auto" className="flex items-center gap-1.5 text-label text-foreground">
                  <Icon icon={Link2} className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{link.title}</span>
                </span>
                {link.snippet ? (
                  <span dir="auto" className="line-clamp-2 text-caption text-muted-foreground">
                    <Snippet text={link.snippet} term={highlight} />
                  </span>
                ) : null}
                {link.path ? (
                  <span dir="auto" className="truncate text-caption text-muted-foreground/80">
                    {link.path}
                  </span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** A side panel listing the documents that link here, with the mentioning line highlighted, and related documents below. */
export function EditorBacklinks({ backlinks, related = [], onOpen, highlight, labels, className, ...props }: EditorBacklinksProps) {
  const { t, locale } = useChromeStrings(labels);
  return (
    <aside data-slot="editor-backlinks" aria-label={t.panel} className={cn("flex flex-col gap-5", className)} {...props}>
      <LinkList heading={t.backlinks} links={backlinks} empty={t.noBacklinks} onOpen={onOpen} highlight={highlight} locale={locale} />
      <LinkList heading={t.related} links={related} empty={t.noRelated} onOpen={onOpen} locale={locale} />
    </aside>
  );
}
