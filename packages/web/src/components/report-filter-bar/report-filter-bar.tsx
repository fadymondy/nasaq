"use client";

import { Bookmark, Copy, Download, Ellipsis, FileText, Link2, Pencil, Printer, RotateCcw, Save, Share2, Trash2, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { ContextMenuActions, type ContextMenuAction, openContextMenuAt } from "../context-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../dropdown-menu";
import { saveExportBlob } from "../export-action";
import { Field, FieldError, FieldLabel, Input } from "../field";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { formatDate } from "../numeric";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { TimeRangePicker, type TimeRangePickerProps } from "../time-range-picker/time-range-picker";
import type { RelativePreset, TimeComparison, TimeRangeValue } from "../time-range-picker/time-range-math";
import { Toggle, ToggleGroup } from "../toggle-group";
import {
  activeFilterCount,
  cleanFieldValues,
  emptyReportFilters,
  isValidViewName,
  RESERVED_FILTER_IDS,
  type ReportDoc,
  type ReportFilterFieldSpec,
  type ReportFilterOption,
  type ReportFilterState,
  reportToMarkdown,
  type SavedReportView,
  uniqueViewName,
} from "./report-filter-math";
import { reportFiltersFromQuery, reportFiltersToQuery, savedViewMatches, savedViewState } from "./report-filter-url";

const STRINGS = {
  en: {
    filters: "Report filters",
    reset: "Reset filters",
    active: (n: number) => (n === 1 ? "1 filter applied" : `${n} filters applied`),
    all: "All",
    selected: (n: number) => `${n} selected`,
    clear: "Clear",
    removeFilter: (name: string) => `Remove filter ${name}`,
    views: "Saved views",
    noViews: "No saved views yet. Set the filters you use often and save them.",
    saveView: "Save view",
    saveAsNew: "Save as new view",
    saveTitle: "Save this view",
    saveHelp: "Stores the period and filters as they are now.",
    renameTitle: "Rename view",
    nameLabel: "Name",
    namePlaceholder: "Weekly review",
    nameInvalid: "Enter a name of up to 60 characters.",
    save: "Save",
    cancel: "Cancel",
    saving: "Saving",
    failed: "That did not save. Try again.",
    apply: "Open view",
    rename: "Rename",
    update: "Update with current filters",
    modified: "Changed",
    share: "Share",
    unshare: "Stop sharing",
    copyLink: "Copy link",
    linkCopied: "Link copied",
    shared: "Shared",
    shareOn: "Anyone with the link can open this view.",
    remove: "Delete",
    deleteTitle: (name: string) => `Delete "${name}"?`,
    deleteBody: "The view is removed for everyone it is shared with. The report itself is not changed.",
    more: (name: string) => `Actions for ${name}`,
    export: "Export",
    print: "Print or save as PDF",
    markdown: "Download Markdown",
    copyMarkdown: "Copy as Markdown",
    copied: "Copied",
    generated: "Generated",
    reportFilters: "Filters",
  },
  ar: {
    filters: "مرشّحات التقرير",
    reset: "إعادة ضبط المرشّحات",
    active: (n: number) => (n === 1 ? "مرشّح واحد مطبّق" : n === 2 ? "مرشّحان مطبّقان" : `${n} مرشّحات مطبّقة`),
    all: "الكل",
    selected: (n: number) => `${n} محدّد`,
    clear: "مسح",
    removeFilter: (name: string) => `إزالة المرشّح ${name}`,
    views: "العروض المحفوظة",
    noViews: "لا توجد عروض محفوظة بعد. اضبط المرشّحات التي تستخدمها كثيرًا واحفظها.",
    saveView: "حفظ العرض",
    saveAsNew: "حفظ كعرض جديد",
    saveTitle: "حفظ هذا العرض",
    saveHelp: "يحفظ الفترة والمرشّحات كما هي الآن.",
    renameTitle: "إعادة تسمية العرض",
    nameLabel: "الاسم",
    namePlaceholder: "المراجعة الأسبوعية",
    nameInvalid: "أدخل اسمًا لا يزيد عن 60 حرفًا.",
    save: "حفظ",
    cancel: "إلغاء",
    saving: "جارٍ الحفظ",
    failed: "تعذّر الحفظ. حاول مرة أخرى.",
    apply: "فتح العرض",
    rename: "إعادة تسمية",
    update: "تحديث بالمرشّحات الحالية",
    modified: "معدَّل",
    share: "مشاركة",
    unshare: "إيقاف المشاركة",
    copyLink: "نسخ الرابط",
    linkCopied: "تم نسخ الرابط",
    shared: "مشترك",
    shareOn: "يمكن لأي شخص لديه الرابط فتح هذا العرض.",
    remove: "حذف",
    deleteTitle: (name: string) => `حذف «${name}»؟`,
    deleteBody: "يُزال العرض لكل من شاركته معه. لا يتغير التقرير نفسه.",
    more: (name: string) => `إجراءات ${name}`,
    export: "تصدير",
    print: "طباعة أو حفظ PDF",
    markdown: "تنزيل Markdown",
    copyMarkdown: "نسخ بصيغة Markdown",
    copied: "تم النسخ",
    generated: "أُنشئ في",
    reportFilters: "المرشّحات",
  },
};
export type ReportFilterBarLabels = typeof STRINGS.en;

/* ------------------------------------------------------------------------------------------------ fields */

export type ReportFilterField = ReportFilterFieldSpec & {
  label: string;
  options: readonly ReportFilterOption[];
  /** Text of the "no filter" choice. Default: the localised "All". */
  allLabel?: string;
};

const DEFAULT_RANGE: TimeRangeValue = { kind: "relative", preset: "30d" };

/* ------------------------------------------------------------------------------------------------ useReportFilters */

export interface UseReportFiltersOptions {
  fields: readonly ReportFilterField[];
  /** The range when the URL has none. Default: the last 30 days. */
  defaultRange?: TimeRangeValue;
  defaultComparison?: TimeComparison;
  /** Values for fields when the URL has none (a default owner, say). */
  defaultFields?: Record<string, string[]>;
  /**
   * Controlled mode: the current query (from your router). Filters are read from it, and `onParamsChange` is called with
   * the next query, which keeps your other params. Leave both out to use the page address.
   */
  params?: URLSearchParams | string;
  onParamsChange?: (params: URLSearchParams) => void;
  /** Keep the filters in the page address (history.replaceState). Default true when `params` is not given; false keeps them in memory. */
  syncLocation?: boolean;
}

export interface ReportFiltersApi {
  state: ReportFilterState;
  defaults: ReportFilterState;
  fields: readonly ReportFilterField[];
  setState: (next: ReportFilterState) => void;
  setRange: (range: TimeRangeValue) => void;
  setComparison: (mode: TimeComparison) => void;
  setField: (id: string, values: string[]) => void;
  reset: () => void;
  /** The filters as a query string, without "?". Empty at the defaults. */
  query: string;
  /** Number of filters that differ from the defaults. */
  activeCount: number;
}

function mergeParams(base: URLSearchParams, own: readonly string[], next: URLSearchParams): URLSearchParams {
  const out = new URLSearchParams(base);
  for (const key of own) out.delete(key);
  next.forEach((value, key) => out.append(key, value));
  return out;
}

/**
 * The report filters as state, with the URL as the source of truth: they read from the query on load, write to it on
 * change, and follow the back button. Defaults stay out of the URL, so a shared link is short. Field ids "range" and
 * "compare" are reserved.
 */
export function useReportFilters({ fields, defaultRange = DEFAULT_RANGE, defaultComparison = "none", defaultFields, params, onParamsChange, syncLocation }: UseReportFiltersOptions): ReportFiltersApi {
  const controlled = params !== undefined;
  const useLocation = !controlled && (syncLocation ?? true);
  // Callers pass inline arrays and objects, so everything below is keyed on its content, not its identity.
  const specKey = JSON.stringify(fields.map((f) => [f.id, f.kind, f.options?.map((o) => o.value) ?? null]));
  const rangeKey = JSON.stringify(defaultRange);
  const fieldsKey = JSON.stringify(defaultFields ?? null);
  const specs = useMemo<readonly ReportFilterFieldSpec[]>(() => fields.map(({ id, kind, options }) => ({ id, kind, options })), [specKey]);
  const defaults = useMemo<ReportFilterState>(() => {
    const base = emptyReportFilters(specs, defaultRange, defaultComparison);
    if (defaultFields) for (const f of specs) if (defaultFields[f.id]) base.fields[f.id] = cleanFieldValues(f, defaultFields[f.id]!);
    return base;
  }, [specs, rangeKey, defaultComparison, fieldsKey]);
  const own = useMemo(() => [...RESERVED_FILTER_IDS, ...specs.map((f) => f.id)], [specs]);

  const [memory, setMemory] = useState<ReportFilterState>(defaults);
  const paramsKey = controlled ? (typeof params === "string" ? params : params.toString()) : "";
  const fromParams = useMemo(() => (controlled ? reportFiltersFromQuery(paramsKey, specs, defaults) : null), [controlled, paramsKey, specs, defaults]);
  const state = fromParams ?? memory;

  useEffect(() => {
    if (!useLocation) return;
    const read = () => setMemory(reportFiltersFromQuery(window.location.search, specs, defaults));
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [useLocation, specs, defaults]);

  const setState = useCallback(
    (next: ReportFilterState) => {
      const clean: ReportFilterState = { ...next, fields: Object.fromEntries(specs.map((f) => [f.id, cleanFieldValues(f, next.fields[f.id] ?? [])])) };
      const nextParams = new URLSearchParams(reportFiltersToQuery(clean, specs, defaults));
      if (controlled) {
        onParamsChange?.(mergeParams(new URLSearchParams(paramsKey), own, nextParams));
        return;
      }
      setMemory(clean);
      if (useLocation) {
        const merged = mergeParams(new URLSearchParams(window.location.search), own, nextParams).toString();
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${merged ? `?${merged}` : ""}${window.location.hash}`);
      }
      onParamsChange?.(nextParams);
    },
    [controlled, defaults, onParamsChange, own, paramsKey, specs, useLocation],
  );

  const setRange = useCallback((range: TimeRangeValue) => setState({ ...state, range }), [setState, state]);
  const setComparison = useCallback((comparison: TimeComparison) => setState({ ...state, comparison }), [setState, state]);
  const setField = useCallback((id: string, values: string[]) => setState({ ...state, fields: { ...state.fields, [id]: values } }), [setState, state]);
  const reset = useCallback(() => setState(defaults), [setState, defaults]);

  return {
    state,
    defaults,
    fields,
    setState,
    setRange,
    setComparison,
    setField,
    reset,
    query: reportFiltersToQuery(state, specs, defaults),
    activeCount: activeFilterCount(state, specs, defaults),
  };
}

/* ------------------------------------------------------------------------------------------------ ReportFilterBar */

export interface ReportFilterBarProps extends Omit<ComponentProps<"div">, "children" | "onChange"> {
  fields: readonly ReportFilterField[];
  state: ReportFilterState;
  onStateChange: (state: ReportFilterState) => void;
  /** What "reset" returns to and what counts as applied. Default: the last 30 days, no comparison, no filters. */
  defaults?: ReportFilterState;
  /** Options for the period picker, or false to hide it. */
  range?: false | Omit<TimeRangePickerProps, "value" | "onValueChange" | "comparison" | "onComparisonChange" | "defaultValue" | "defaultComparison">;
  /** Show "Compare with" beside the period. Default false. */
  comparison?: boolean;
  /** Presets for the period picker (shortcut for `range.presets`). */
  presets?: readonly RelativePreset[];
  /** Controls on the end side (export, refresh). */
  actions?: ReactNode;
  labels?: Partial<ReportFilterBarLabels>;
}

/**
 * The filters of a report: a period (presets, week, custom days, optional comparison) and any number of choice filters,
 * with removable chips for what is applied and a reset. It only edits `state`; use `useReportFilters` to keep that state
 * in the URL, `SavedReportViews` to name it and `ReportExportMenu` to take it away.
 */
export function ReportFilterBar({ fields, state, onStateChange, defaults, range, comparison = false, presets, actions, labels, className, ...props }: ReportFilterBarProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const specs = fields as readonly ReportFilterFieldSpec[];
  const base = useMemo(() => defaults ?? emptyReportFilters(specs, DEFAULT_RANGE), [defaults, specs]);
  const count = activeFilterCount(state, specs, base);
  const setField = (id: string, values: string[]) => onStateChange({ ...state, fields: { ...state.fields, [id]: values } });
  const chips = fields.flatMap((f) =>
    cleanFieldValues(f, state.fields[f.id] ?? []).map((v) => ({ field: f, value: v, label: f.options.find((o) => o.value === v)?.label ?? v })),
  );

  return (
    <div data-slot="report-filter-bar" role="group" aria-label={t.filters} className={cn("flex w-full min-w-0 flex-col gap-3", className)} {...props}>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        {range === false ? null : (
          <TimeRangePicker
            {...range}
            presets={presets ?? range?.presets}
            value={state.range}
            onValueChange={(next) => onStateChange({ ...state, range: next })}
            {...(comparison ? { comparison: state.comparison, onComparisonChange: (mode: TimeComparison) => onStateChange({ ...state, comparison: mode }) } : {})}
          />
        )}
        {fields.map((f) => (
          <FilterControl key={f.id} field={f} values={cleanFieldValues(f, state.fields[f.id] ?? [])} onChange={(v) => setField(f.id, v)} t={t} />
        ))}
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <span aria-live="polite" className="text-caption text-muted-foreground">
            {count > 0 ? t.active(count) : ""}
          </span>
          <Button variant="ghost" size="sm" disabled={count === 0} onClick={() => onStateChange(base)}>
            <RotateCcw aria-hidden className="rtl:-scale-x-100" />
            {t.reset}
          </Button>
          {actions}
        </div>
      </div>
      {chips.length > 0 ? (
        <ul data-slot="report-filter-chips" className="flex flex-wrap gap-1.5" aria-label={t.filters}>
          {chips.map((c) => (
            <li key={`${c.field.id}:${c.value}`}>
              <Badge variant="outline" className="gap-1 pe-1">
                <span className="text-muted-foreground">{c.field.label}:</span> {c.label}
                <button
                  type="button"
                  aria-label={t.removeFilter(`${c.field.label}: ${c.label}`)}
                  className="inline-flex size-4 items-center justify-center rounded-full outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
                  onClick={() => setField(c.field.id, cleanFieldValues(c.field, (state.fields[c.field.id] ?? []).filter((v) => v !== c.value)))}
                >
                  <X aria-hidden className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FilterControl({ field, values, onChange, t }: { field: ReportFilterField; values: string[]; onChange: (values: string[]) => void; t: ReportFilterBarLabels }) {
  const id = useId();
  const allLabel = field.allLabel ?? t.all;
  return (
    <div data-slot="report-filter-field" className="flex min-w-0 flex-col gap-1">
      <span id={id} className="text-caption text-muted-foreground">
        {field.label}
      </span>
      {field.kind === "select" ? (
        <Select
          items={[{ value: "", label: allLabel }, ...field.options]}
          value={values[0] ?? ""}
          onValueChange={(v) => onChange(v ? [String(v)] : [])}
        >
          <SelectTrigger aria-labelledby={id} className="h-control-sm w-auto min-w-36 max-w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{allLabel}</SelectItem>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.kind === "toggle" ? (
        <ToggleGroup aria-labelledby={id} value={values.length ? values : [""]} onValueChange={(v) => onChange(v.filter((x) => x !== "").slice(-1))}>
          <Toggle value="" aria-label={allLabel}>
            {allLabel}
          </Toggle>
          {field.options.map((o) => (
            <Toggle key={o.value} value={o.value}>
              {o.label}
            </Toggle>
          ))}
        </ToggleGroup>
      ) : (
        <Popover>
          <PopoverTrigger render={<Button variant="secondary" size="sm" aria-labelledby={id} className="min-w-36 justify-between" />}>
            {values.length === 0 ? allLabel : values.length === 1 ? (field.options.find((o) => o.value === values[0])?.label ?? values[0]) : t.selected(values.length)}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-1">
            <ul className="flex max-h-64 flex-col overflow-y-auto">
              {field.options.map((o) => {
                const on = values.includes(o.value);
                return (
                  <li key={o.value}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-body-sm hover:bg-nq-hover">
                      <Checkbox checked={on} onCheckedChange={(next) => onChange(next ? [...values, o.value] : values.filter((v) => v !== o.value))} />
                      <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-border p-1">
              <Button variant="ghost" size="sm" disabled={values.length === 0} onClick={() => onChange([])}>
                {t.clear}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ SavedReportViews */

type Pending = { kind: "save" } | { kind: "rename"; view: SavedReportView } | { kind: "delete"; view: SavedReportView } | null;

export interface SavedReportViewsProps extends Omit<ComponentProps<"section">, "children" | "onChange"> {
  views: readonly SavedReportView[];
  fields: readonly ReportFilterField[];
  /** The current filters. */
  state: ReportFilterState;
  defaults?: ReportFilterState;
  /** Open a view: set the filters to `next`. */
  onApply: (view: SavedReportView, next: ReportFilterState) => void;
  /** Save the current filters as a new view. `query` is what to store. Throw to show an error. */
  onSave: (name: string, query: string) => void | Promise<void>;
  onRename?: (view: SavedReportView, name: string) => void | Promise<void>;
  /** Replace what a view stores with the current filters. */
  onUpdate?: (view: SavedReportView, query: string) => void | Promise<void>;
  /**
   * Turn sharing on or off. When it turns on, return the link and it is copied to the clipboard. Without this the
   * share actions are hidden.
   */
  onShare?: (view: SavedReportView, shared: boolean) => string | void | Promise<string | void>;
  onDelete?: (view: SavedReportView) => void | Promise<void>;
  /** The opened view (controlled). Default: the last opened, or the one whose filters match. */
  activeId?: string | null;
  labels?: Partial<ReportFilterBarLabels>;
}

/**
 * Named filter sets for a report. Each view is a chip; context-click, the Menu key or the "..." button opens
 * rename, update, share and delete. A view opened and then changed shows "Changed", with update and save-as-new.
 */
export function SavedReportViews({ views, fields, state, defaults, onApply, onSave, onRename, onUpdate, onShare, onDelete, activeId, labels, className, ...props }: SavedReportViewsProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const specs = fields as readonly ReportFilterFieldSpec[];
  const base = useMemo(() => defaults ?? emptyReportFilters(specs, DEFAULT_RANGE), [defaults, specs]);
  const [opened, setOpened] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [note, setNote] = useState("");
  const currentId = activeId !== undefined ? activeId : opened;
  const matching = views.find((v) => savedViewMatches(v, state, specs, base));
  const current = views.find((v) => v.id === currentId) ?? matching;
  const dirty = current ? !savedViewMatches(current, state, specs, base) : false;
  const query = reportFiltersToQuery(state, specs, base);

  const apply = (view: SavedReportView) => {
    setOpened(view.id);
    onApply(view, savedViewState(view, specs, base));
  };

  const actionsFor = (view: SavedReportView): ContextMenuAction[] => {
    const list: ContextMenuAction[] = [{ id: "apply", label: t.apply, icon: Bookmark, onSelect: () => apply(view), group: "open" }];
    if (onRename) list.push({ id: "rename", label: t.rename, icon: Pencil, onSelect: () => setPending({ kind: "rename", view }), group: "edit" });
    if (onUpdate) {
      list.push({
        id: "update",
        label: t.update,
        icon: Save,
        disabled: savedViewMatches(view, state, specs, base),
        onSelect: () => void run(() => onUpdate(view, query)),
        group: "edit",
      });
    }
    if (onShare) {
      if (view.shared) {
        list.push({ id: "copy", label: t.copyLink, icon: Link2, onSelect: () => void run(async () => copyLink(await onShare(view, true))), group: "share" });
        list.push({ id: "unshare", label: t.unshare, icon: Share2, onSelect: () => void run(() => onShare(view, false)), group: "share" });
      } else {
        list.push({ id: "share", label: t.share, icon: Share2, onSelect: () => void run(async () => copyLink(await onShare(view, true))), group: "share" });
      }
    }
    if (onDelete) list.push({ id: "delete", label: t.remove, icon: Trash2, danger: true, onSelect: () => setPending({ kind: "delete", view }), group: "danger" });
    return list;
  };

  const run = async (fn: () => unknown) => {
    try {
      await fn();
    } catch {
      setNote(t.failed);
    }
  };
  const copyLink = (link: string | void) => {
    if (typeof link !== "string") return;
    void navigator.clipboard?.writeText(link).then(() => setNote(t.linkCopied)).catch(() => undefined);
  };

  return (
    <section data-slot="saved-report-views" aria-label={t.views} className={cn("flex w-full min-w-0 flex-col gap-2", className)} {...props}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-label text-muted-foreground">{t.views}</h3>
        {views.length === 0 ? <p className="text-body-sm text-muted-foreground">{t.noViews}</p> : null}
        <ul className="flex min-w-0 flex-wrap items-center gap-1.5">
          {views.map((view) => {
            const on = current?.id === view.id;
            return (
              <ContextMenuActions key={view.id} actions={actionsFor(view)} render={<li className="flex items-center rounded-full" />}>
                <Button
                  variant={on ? "secondary" : "ghost"}
                  size="sm"
                  aria-pressed={on}
                  className={cn("rounded-full", on && "border-primary")}
                  onClick={() => apply(view)}
                >
                  {view.name}
                  {view.shared ? <Badge variant="info">{t.shared}</Badge> : null}
                  {on && dirty ? <Badge variant="warning">{t.modified}</Badge> : null}
                </Button>
                {actionsFor(view).length > 1 ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.more(view.name)}
                    onClick={(e) => openContextMenuAt(e.currentTarget.closest("li") as HTMLElement)}
                  >
                    <Ellipsis aria-hidden />
                  </Button>
                ) : null}
              </ContextMenuActions>
            );
          })}
        </ul>
        <div className="ms-auto flex items-center gap-2">
          {dirty && current && onUpdate ? (
            <Button variant="secondary" size="sm" onClick={() => void run(() => onUpdate(current, query))}>
              <Save aria-hidden />
              {t.update}
            </Button>
          ) : null}
          <Button variant={dirty || !current ? "primary" : "ghost"} size="sm" onClick={() => setPending({ kind: "save" })}>
            <Bookmark aria-hidden />
            {dirty ? t.saveAsNew : t.saveView}
          </Button>
        </div>
      </div>
      <p aria-live="polite" className="min-h-4 text-caption text-muted-foreground">
        {note}
      </p>

      <NameDialog
        open={pending?.kind === "save" || pending?.kind === "rename"}
        title={pending?.kind === "rename" ? t.renameTitle : t.saveTitle}
        description={pending?.kind === "rename" ? undefined : t.saveHelp}
        initial={pending?.kind === "rename" ? pending.view.name : ""}
        taken={views.filter((v) => (pending?.kind === "rename" ? v.id !== pending.view.id : true)).map((v) => v.name)}
        t={t}
        onClose={() => setPending(null)}
        onSubmit={async (name) => {
          if (pending?.kind === "rename") await onRename?.(pending.view, name);
          else await onSave(name, query);
        }}
      />
      <AlertDialog open={pending?.kind === "delete"} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.kind === "delete" ? t.deleteTitle(pending.view.name) : ""}</AlertDialogTitle>
            <AlertDialogDescription>{t.deleteBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const view = pending?.kind === "delete" ? pending.view : null;
                if (view) void run(() => onDelete?.(view));
              }}
            >
              {t.remove}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function NameDialog({
  open,
  title,
  description,
  initial,
  taken,
  t,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: string;
  initial: string;
  taken: readonly string[];
  t: ReportFilterBarLabels;
  onClose: () => void;
  onSubmit: (name: string) => void | Promise<void>;
}) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setName(initial);
      setError("");
      setBusy(false);
    }
    wasOpen.current = open;
  }, [open, initial]);
  const valid = isValidViewName(name);
  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit(uniqueViewName(name, taken));
      onClose();
    } catch {
      setError(t.failed);
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Field invalid={name !== "" && !valid}>
            <FieldLabel>{t.nameLabel}</FieldLabel>
            <Input value={name} maxLength={80} autoFocus placeholder={t.namePlaceholder} onChange={(e) => setName(e.target.value)} />
            {name !== "" && !valid ? <FieldError match>{t.nameInvalid}</FieldError> : null}
          </Field>
          {error ? (
            <p role="alert" className="text-body-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              {t.cancel}
            </Button>
            <Button type="submit" loading={busy} disabled={!valid}>
              {busy ? t.saving : t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------------------------------------ ReportSheet */

const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  [data-slot="report-sheet"], [data-slot="report-sheet"] * { visibility: visible !important; }
  [data-slot="report-sheet"] { position: absolute; inset-inline-start: 0; inset-block-start: 0; width: 100%; box-shadow: none; border: 0; padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  [data-slot="report-sheet"] [data-print-hide] { display: none !important; }
  [data-slot="report-sheet"] section, [data-slot="report-sheet"] tr, [data-slot="report-sheet"] figure { break-inside: avoid; }
}
@page { margin: 14mm; }`;

export interface ReportSheetProps extends Omit<ComponentProps<"article">, "title"> {
  title: ReactNode;
  subtitle?: ReactNode;
  /** What the report was filtered by, printed under the title so a paper copy is self-explanatory. */
  filters?: readonly { label: string; value: string }[];
  /** When the report was made. Default: now, when it first shows. */
  generatedAt?: Date;
  timeZone?: string;
  /** Controls that show on screen only (the export menu, the filter bar). */
  toolbar?: ReactNode;
  footer?: ReactNode;
  labels?: Partial<ReportFilterBarLabels>;
  children?: ReactNode;
}

/**
 * The page a report prints on. On screen it is a bordered sheet; when printed it drops the frame and everything else on the
 * page, breaks between sections, and keeps colours. Anything with `data-print-hide` (or `print:hidden`) stays off paper.
 * Write chart and table sections as `<section>` so a page break never cuts one in half.
 */
export function ReportSheet({ title, subtitle, filters, generatedAt, timeZone, toolbar, footer, labels, children, className, ...props }: ReportSheetProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const [made] = useState(() => generatedAt ?? new Date());
  const locale = useOptionalNasaq()?.locale ?? "en";
  const stamp = formatDate(made, locale, { dateStyle: "medium", timeStyle: "short", ...(timeZone ? { timeZone } : {}) });
  return (
    <article data-slot="report-sheet" className={cn("flex w-full min-w-0 flex-col gap-6 rounded-card border border-border bg-card p-4 sm:p-6", className)} {...props}>
      <style>{PRINT_CSS}</style>
      <header className="flex flex-col gap-2 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-title text-foreground">{title}</h1>
            {subtitle ? <p className="text-body text-muted-foreground">{subtitle}</p> : null}
          </div>
          {toolbar ? (
            <div data-print-hide className="flex items-center gap-2 print:hidden">
              {toolbar}
            </div>
          ) : null}
        </div>
        {filters?.length ? (
          <dl aria-label={t.reportFilters} className="flex flex-wrap gap-x-5 gap-y-1 text-body-sm">
            {filters.map((f) => (
              <div key={f.label} className="flex gap-1.5">
                <dt className="text-muted-foreground">{f.label}:</dt>
                <dd className="text-foreground">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <p className="text-caption text-muted-foreground">
          {t.generated} {stamp}
        </p>
      </header>
      {children}
      {footer ? <footer className="border-t border-border pt-3 text-caption text-muted-foreground">{footer}</footer> : null}
    </article>
  );
}

/* ------------------------------------------------------------------------------------------------ ReportExportMenu */

export type ReportExportFormat = "pdf" | "markdown" | "copy";

export interface ReportExportMenuProps extends Omit<ComponentProps<typeof Button>, "children" | "onClick"> {
  /** The report as data, or a function that builds it when the user exports (so it is always current). */
  document: ReportDoc | (() => ReportDoc);
  /** File name without extension. Default: the report title. */
  filename?: string;
  /** Which formats to offer. Default: PDF (print), Markdown and copy. */
  formats?: readonly ReportExportFormat[];
  /** Replace the browser print dialog for PDF, for example to call a server that makes the file. */
  onPrint?: () => void | Promise<void>;
  /** Called after an export was made. */
  onExported?: (format: ReportExportFormat) => void;
  labels?: Partial<ReportFilterBarLabels>;
}

/**
 * An Export menu for a report: "Print or save as PDF" opens the browser print dialog for the `ReportSheet` (or calls
 * `onPrint`), Markdown downloads a `.md` file built from the same `document` data, and Copy puts it on the clipboard.
 */
export function ReportExportMenu({ document: doc, filename, formats = ["pdf", "markdown", "copy"], onPrint, onExported, labels, variant = "secondary", size = "sm", ...props }: ReportExportMenuProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const [note, setNote] = useState("");
  const build = () => (typeof doc === "function" ? doc() : doc);
  const name = (d: ReportDoc) => (filename ?? d.title).trim().replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "") || "report";
  const run = async (format: ReportExportFormat) => {
    try {
      if (format === "pdf") {
        if (onPrint) await onPrint();
        else window.print();
      } else {
        const d = build();
        const md = reportToMarkdown(d);
        if (format === "markdown") saveExportBlob(new Blob([md], { type: "text/markdown;charset=utf-8" }), `${name(d)}.md`);
        else {
          await navigator.clipboard.writeText(md);
          setNote(t.copied);
        }
      }
      onExported?.(format);
    } catch {
      setNote(t.failed);
    }
  };
  const items: { id: ReportExportFormat; label: string; icon: typeof Printer }[] = [
    { id: "pdf", label: t.print, icon: Printer },
    { id: "markdown", label: t.markdown, icon: FileText },
    { id: "copy", label: t.copyMarkdown, icon: Copy },
  ];
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant={variant} size={size} data-slot="report-export-menu" {...props} />}>
          <Download aria-hidden />
          {t.export}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {items
            .filter((i) => formats.includes(i.id))
            .map((i) => (
              <DropdownMenuItem key={i.id} onClick={() => void run(i.id)}>
                <i.icon aria-hidden />
                {i.label}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <span aria-live="polite" className="sr-only">
        {note}
      </span>
    </>
  );
}
