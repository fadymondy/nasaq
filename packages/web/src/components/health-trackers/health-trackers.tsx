"use client";

import { CircleHelp, ChevronDown, Flag, GlassWater, Pencil, Pin, PinOff, Plus, ShieldCheck, Trash2, TriangleAlert, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Checkbox } from "../checkbox";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../collapsible";
import { ContextMenuActions, type ContextMenuAction } from "../context-menu";
import { TimerRing } from "../countdown";
import { CardMeta, EntityIdentity, type EntityFacet, EntityList, type EntityListProps, TagList } from "../entity-list";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { DateTime, formatNumber } from "../numeric";
import { EmptyState, Skeleton } from "../states";
import { Status } from "../status";
import { ScrollFade, UserText } from "../text-utilities";
import { type CupState, cupCounts, cupState, type FoodDraft, foodDraftCompleteness, type FoodDraftStep, foodDraftValid, type FoodKind, type FoodVerdict, type FoodVerdictSource, verdictCounts, verdictTone } from "./health-trackers-logic";

const STRINGS = {
  en: {
    cupsLabel: "{filled} of {total} cups logged today",
    cupNext: "Log one cup",
    cupWait: "Wait {time} for the next cup",
    cupsDone: "Every cup logged. That is the day done.",
    cupsLogging: "Logging",
    cupsFailed: "Could not log the cup.",
    pinnedTitle: "Quick log",
    pinnedEmpty: "Pin the things you log every day and they show up here as one-tap buttons.",
    pinnedOpenCatalogue: "Open the catalogue",
    pinnedLogged: "Logged {name}",
    pinnedFlagged: "Logged {name} and flagged it",
    pinnedFailed: "Could not log {name}.",
    logAnyway: "Log anyway",
    unpin: "Unpin",
    pin: "Pin to quick log",
    catalogue: "Food and drink catalogue",
    searchPlaceholder: "Search the catalogue…",
    name: "Name",
    kind: "Type",
    verdict: "Verdict",
    families: "Trigger families",
    note: "Note",
    pinned: "Pinned",
    kindFood: "Food",
    kindDrink: "Drink",
    verdictSafe: "Safe",
    verdictTrigger: "Trigger",
    verdictUnreviewed: "Unreviewed",
    sourceNone: "Not decided",
    sourceYou: "Decided by you",
    sourceCatalogue: "From the catalogue",
    sourceClinician: "From your clinician",
    unreviewedHint: "Nobody has judged this yet. It is not the same as safe.",
    catalogueEmpty: "The catalogue is empty",
    catalogueEmptyHint: "Add the foods and drinks you log so each one carries a verdict.",
    add: "Add item",
    edit: "Edit",
    delete: "Delete",
    deleteTitle: "Delete {name}?",
    deleteBody: "It leaves the catalogue and your quick log. Entries already logged keep their record.",
    cancel: "Cancel",
    deleting: "Deleting",
    actionFailed: "That did not work. Try again.",
    builderNew: "New item",
    builderEdit: "Edit item",
    builderNameAr: "Arabic name",
    builderNameArHint: "Shown when the app is in Arabic.",
    builderNameRequired: "Give the item a name.",
    builderVerdict: "Verdict",
    builderFamilies: "Trigger families",
    builderFamiliesHint: "Pick every family this item belongs to.",
    builderFamiliesRequired: "A trigger needs at least one family.",
    builderNote: "Note",
    builderNoteHint: "Kept as written, for your own doctor. Nothing adds it up.",
    builderSave: "Save item",
    builderSaving: "Saving",
    builderCompleteness: "{done} of {total} steps",
    builderCompletenessLabel: "Entry completeness",
    builderMissingIntro: "Still to add",
    stepName: "a name",
    stepNameAr: "an Arabic name",
    stepVerdict: "a verdict",
    stepFamilies: "a trigger family",
    stepNote: "a note",
    flaggedTitle: "Flagged entries",
    flaggedCount: "{count} flagged",
    flaggedNone: "Nothing flagged today.",
    flaggedIntro: "These were recorded, then flagged against your protocol. They are not errors.",
    flaggedLoading: "Loading flagged entries",
    flaggedFailed: "Could not load the flagged entries.",
    retry: "Try again",
  },
  ar: {
    cupsLabel: "{filled} من {total} أكواب مسجّلة اليوم",
    cupNext: "سجّل كوبًا",
    cupWait: "انتظر {time} للكوب التالي",
    cupsDone: "سُجّلت كل الأكواب. اكتمل اليوم.",
    cupsLogging: "جارٍ التسجيل",
    cupsFailed: "تعذر تسجيل الكوب.",
    pinnedTitle: "تسجيل سريع",
    pinnedEmpty: "ثبّت ما تسجّله كل يوم ليظهر هنا كأزرار بلمسة واحدة.",
    pinnedOpenCatalogue: "افتح الكتالوج",
    pinnedLogged: "سُجّل {name}",
    pinnedFlagged: "سُجّل {name} ووُضعت عليه علامة",
    pinnedFailed: "تعذر تسجيل {name}.",
    logAnyway: "سجّل على أي حال",
    unpin: "إلغاء التثبيت",
    pin: "ثبّت في التسجيل السريع",
    catalogue: "كتالوج الأطعمة والمشروبات",
    searchPlaceholder: "ابحث في الكتالوج…",
    name: "الاسم",
    kind: "النوع",
    verdict: "الحكم",
    families: "عائلات المحفّزات",
    note: "ملاحظة",
    pinned: "مثبّت",
    kindFood: "طعام",
    kindDrink: "مشروب",
    verdictSafe: "آمن",
    verdictTrigger: "محفّز",
    verdictUnreviewed: "لم يُراجَع",
    sourceNone: "لم يُحسم",
    sourceYou: "حسمتَه أنت",
    sourceCatalogue: "من الكتالوج",
    sourceClinician: "من طبيبك",
    unreviewedHint: "لم يحكم عليه أحد بعد. وهذا لا يعني أنه آمن.",
    catalogueEmpty: "الكتالوج فارغ",
    catalogueEmptyHint: "أضف الأطعمة والمشروبات التي تسجّلها ليحمل كل منها حكمًا.",
    add: "إضافة عنصر",
    edit: "تعديل",
    delete: "حذف",
    deleteTitle: "حذف {name}؟",
    deleteBody: "يخرج من الكتالوج ومن التسجيل السريع. تحتفظ الإدخالات المسجّلة بسجلها.",
    cancel: "إلغاء",
    deleting: "جارٍ الحذف",
    actionFailed: "لم تنجح العملية. حاول مرة أخرى.",
    builderNew: "عنصر جديد",
    builderEdit: "تعديل العنصر",
    builderNameAr: "الاسم بالعربية",
    builderNameArHint: "يظهر عندما يكون التطبيق بالعربية.",
    builderNameRequired: "أعطِ العنصر اسمًا.",
    builderVerdict: "الحكم",
    builderFamilies: "عائلات المحفّزات",
    builderFamiliesHint: "اختر كل عائلة ينتمي إليها هذا العنصر.",
    builderFamiliesRequired: "يحتاج المحفّز إلى عائلة واحدة على الأقل.",
    builderNote: "ملاحظة",
    builderNoteHint: "تبقى كما كُتبت، لطبيبك. لا شيء يجمعها.",
    builderSave: "حفظ العنصر",
    builderSaving: "جارٍ الحفظ",
    builderCompleteness: "{done} من {total} خطوات",
    builderCompletenessLabel: "اكتمال الإدخال",
    builderMissingIntro: "ما زال ناقصًا",
    stepName: "اسم",
    stepNameAr: "اسم بالعربية",
    stepVerdict: "حكم",
    stepFamilies: "عائلة محفّز",
    stepNote: "ملاحظة",
    flaggedTitle: "الإدخالات المعلَّمة",
    flaggedCount: "{count} معلَّمة",
    flaggedNone: "لا شيء معلَّم اليوم.",
    flaggedIntro: "سُجّلت هذه ثم عُلّمت بالنسبة لبروتوكولك. ليست أخطاء.",
    flaggedLoading: "جارٍ تحميل الإدخالات المعلَّمة",
    flaggedFailed: "تعذر تحميل الإدخالات المعلَّمة.",
    retry: "حاول مرة أخرى",
  },
};

export type HealthTrackersLabels = Partial<(typeof STRINGS)["en"]>;

function useStrings(labels?: HealthTrackersLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  return { ar, locale, t: { ...STRINGS[ar ? "ar" : "en"], ...labels } };
}

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/** What an async action may resolve with. `error` shows the message and leaves the state as it was. */
export type HealthTrackerResult = void | { error?: string };

/* ------------------------------------------------------------- CupTracker */

/** One drinking glass. The shape is drawn here, it is not a brand mark. */
function Cup({ state }: { state: CupState }) {
  return (
    <svg viewBox="0 0 24 32" aria-hidden className="size-full">
      <path
        d="M4 4 h16 l-2 24 a2 2 0 0 1 -2 2 h-8 a2 2 0 0 1 -2 -2 z"
        strokeWidth={1.6}
        strokeLinejoin="round"
        className={cn(state === "filled" ? "fill-nq-success stroke-nq-success" : "fill-transparent", state === "next" && "stroke-primary", state === "empty" && "stroke-nq-line-strong")}
      />
      {state === "filled" ? <path d="M8 17 l3 3 l6 -7" fill="none" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="stroke-background" /> : null}
    </svg>
  );
}

export interface CupTrackerProps extends Omit<ComponentProps<"div">, "children"> {
  /** Units logged today. */
  filled: number;
  /** How long the row is. Give the number your server sent; nothing here works out a day's length. */
  total: number;
  /** Logs one unit. Not "set the total to N": there is a single intent. */
  onLog: () => Promise<HealthTrackerResult>;
  /** Blocks logging, for example while a cooldown runs. */
  disabled?: boolean;
  /** Time left before the next cup can be logged, already formatted (for example "0:12"). Shown on the next cup. */
  waitLabel?: string;
  /** What one cup holds, shown under the row (for example "250 ml"). */
  unitLabel?: ReactNode;
  labels?: HealthTrackersLabels;
}

/**
 * A day of a countable unit drawn as the cups it takes. Filled cups are logged, the next one is the only button, the
 * rest are outlines. The whole row has one accessible name ("7 of 20 cups logged today").
 */
export function CupTracker({ filled: filledProp, total: totalProp, onLog, disabled = false, waitLabel, unitLabel, labels, className, ...props }: CupTrackerProps) {
  const { locale, t } = useStrings(labels);
  const { filled, total } = cupCounts(filledProp, totalProp);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const done = total > 0 && filled >= total;

  const log = async () => {
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      const result = await onLog();
      if (result && typeof result === "object" && result.error) setError(result.error);
    } catch {
      setError(t.cupsFailed);
    } finally {
      setPending(false);
    }
  };

  return (
    <div data-slot="cup-tracker" className={cn("flex min-w-0 flex-col gap-2", className)} {...props}>
      <div role="group" aria-label={fill(t.cupsLabel, { filled: formatNumber(filled, locale), total: formatNumber(total, locale) })} className="grid grid-cols-[repeat(auto-fill,minmax(1.75rem,1fr))] gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const state = cupState(i, filled, total);
          if (state !== "next") {
            return (
              <span key={i} data-state={state} className="aspect-[3/4] w-full">
                <Cup state={state} />
              </span>
            );
          }
          const blocked = disabled || pending;
          return (
            <button
              key={i}
              type="button"
              data-state="next"
              disabled={blocked}
              aria-busy={pending || undefined}
              aria-label={waitLabel ? fill(t.cupWait, { time: waitLabel }) : t.cupNext}
              onClick={() => void log()}
              className="relative aspect-[3/4] w-full rounded-control outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-60"
            >
              <Cup state="next" />
              <span dir="ltr" className="absolute inset-0 flex items-center justify-center text-caption font-medium tabular-nums text-muted-foreground">
                {waitLabel ?? <Plus aria-hidden className="size-3.5 text-primary" />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
        <span className="tabular-nums">
          {formatNumber(filled, locale)} / {formatNumber(total, locale)}
        </span>
        {unitLabel ? <bdi dir="ltr">{unitLabel}</bdi> : null}
        {pending ? <span role="status">{t.cupsLogging}</span> : null}
        {done ? (
          <span role="status" className="text-nq-success-text">
            {t.cupsDone}
          </span>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-caption text-nq-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------- QuickLogStrip */

export interface QuickLogItem {
  id: string;
  /** Shown when the app is in English (or as the only name). */
  name: string;
  /** Shown when the app is in Arabic. */
  nameAr?: string;
  icon?: ReactNode;
}

export type QuickLogResult = void | {
  /** The entry was recorded but flagged against the protocol. A warning, not a failure. */
  flagged?: boolean;
  /** The server's own sentence, shown as it came. */
  message?: string;
  /** Refused. Shown as a failure. */
  error?: string;
  /** With `error`: offer "Log anyway", which calls `onLog` again with `override`. */
  canOverride?: boolean;
};

export interface QuickLogStripProps extends Omit<ComponentProps<"section">, "children" | "title"> {
  items: readonly QuickLogItem[];
  /** Logs one entry. The server decides what it means; the strip only shows the answer. */
  onLog: (item: QuickLogItem, options: { override: boolean }) => Promise<QuickLogResult>;
  /** Adds an "Unpin" action to each button's context menu. */
  onUnpin?: (item: QuickLogItem) => Promise<HealthTrackerResult>;
  /** Where the empty state sends people to pin items. */
  catalogueHref?: string;
  loading?: boolean;
  title?: ReactNode;
  labels?: HealthTrackersLabels;
}

/**
 * The handful of things you log every day, as one-tap buttons in a row that scrolls with faded edges. A flagged entry is
 * a warning, not an error: it was recorded. A refusal shows the server's sentence and, when it allows, "Log anyway".
 */
export function QuickLogStrip({ items, onLog, onUnpin, catalogueHref, loading = false, title, labels, className, ...props }: QuickLogStripProps) {
  const { ar, t } = useStrings(labels);
  const [busyId, setBusyId] = useState<string>();
  const [outcome, setOutcome] = useState<{ tone: "success" | "warning" | "danger"; text: string; retry?: () => void }>();
  const headingId = useId();

  const nameOf = (item: QuickLogItem) => (ar && item.nameAr ? item.nameAr : item.name);

  const run = async (item: QuickLogItem, override = false) => {
    setBusyId(item.id);
    setOutcome(undefined);
    const name = nameOf(item);
    try {
      const result = await onLog(item, { override });
      if (result && result.error) setOutcome({ tone: "danger", text: result.error, retry: result.canOverride ? () => void run(item, true) : undefined });
      else if (result && result.flagged) setOutcome({ tone: "warning", text: result.message ?? fill(t.pinnedFlagged, { name }) });
      else setOutcome({ tone: "success", text: result?.message ?? fill(t.pinnedLogged, { name }) });
    } catch {
      setOutcome({ tone: "danger", text: fill(t.pinnedFailed, { name }) });
    } finally {
      setBusyId(undefined);
    }
  };

  const actionsFor = (item: QuickLogItem): ContextMenuAction[] =>
    onUnpin ? [{ id: "unpin", label: t.unpin, icon: PinOff, onSelect: () => void onUnpin(item) }] : [];

  return (
    <section data-slot="quick-log-strip" aria-labelledby={headingId} className={cn("flex min-w-0 flex-col gap-2", className)} {...props}>
      <h3 id={headingId} className="text-eyebrow text-muted-foreground">
        {title ?? t.pinnedTitle}
      </h3>
      {loading ? (
        <div className="flex gap-2">
          <Skeleton className="h-control w-24" />
          <Skeleton className="h-control w-28" />
          <Skeleton className="h-control w-20" />
        </div>
      ) : items.length === 0 ? (
        <p className="flex flex-wrap items-center gap-x-2 text-body-sm text-muted-foreground">
          {t.pinnedEmpty}
          {catalogueHref ? (
            <a href={catalogueHref} className="text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current">
              {t.pinnedOpenCatalogue}
            </a>
          ) : null}
        </p>
      ) : (
        <ScrollFade label={title ? undefined : t.pinnedTitle} contentClassName="pb-1">
          {items.map((item) => (
            <ContextMenuActions key={item.id} actions={actionsFor(item)} render={<div className="shrink-0" />} focusTarget={(el) => el.querySelector("button")}>
              <Button variant="secondary" loading={busyId === item.id} disabled={busyId !== undefined && busyId !== item.id} onClick={() => void run(item)}>
                {item.icon}
                <UserText>{nameOf(item)}</UserText>
              </Button>
            </ContextMenuActions>
          ))}
        </ScrollFade>
      )}
      <div role="status" aria-live="polite" className="min-h-5">
        {outcome ? (
          <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-caption", outcome.tone === "success" && "text-nq-success-text", outcome.tone === "warning" && "text-nq-warning-text", outcome.tone === "danger" && "text-nq-danger-text")}>
            {outcome.text}
            {outcome.retry ? (
              <Button variant="link" size="sm" onClick={outcome.retry}>
                {t.logAnyway}
              </Button>
            ) : null}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- FoodCatalogue */

export interface FoodCatalogueItem {
  id: string;
  kind: FoodKind;
  name: string;
  nameAr?: string;
  verdict: FoodVerdict;
  /** Who decided it. Shown beside any verdict except unreviewed. */
  verdictSource?: FoodVerdictSource;
  /** Ids of the trigger families this item belongs to. */
  triggerFamilies?: readonly string[];
  /** Free text, shown as written. */
  note?: string;
  pinned?: boolean;
  /** Private items belong to one person; public ones come from the shared catalogue. */
  isPublic?: boolean;
}

export interface FoodFamily {
  id: string;
  name: string;
  nameAr?: string;
}

const VERDICT_ICON = { safe: ShieldCheck, trigger: TriangleAlert, unreviewed: CircleHelp } as const;

export interface FoodCatalogueProps extends Omit<EntityListProps<FoodCatalogueItem>, "data" | "columns" | "getRowId" | "renderCard" | "label" | "facets" | "labels" | "rowActions" | "toolbar"> {
  items: readonly FoodCatalogueItem[];
  families?: readonly FoodFamily[];
  /** Pins or unpins an item. */
  onPin?: (item: FoodCatalogueItem, pinned: boolean) => Promise<HealthTrackerResult>;
  onEdit?: (item: FoodCatalogueItem) => void;
  /** Deletes an item after the person confirms. */
  onDelete?: (item: FoodCatalogueItem) => Promise<HealthTrackerResult>;
  onAdd?: () => void;
  label?: string;
  labels?: HealthTrackersLabels & EntityListProps<FoodCatalogueItem>["labels"];
}

/**
 * The classified catalogue: every food and drink carries a verdict (safe, trigger or unreviewed), who decided it, its
 * trigger families and the person's own note. Unreviewed is neutral and says so: it is never styled as safe. A table
 * or cards with search and verdict, type and family filters; pin, edit and delete are row actions and also open from
 * the context menu.
 */
export function FoodCatalogue({ items, families = [], onPin, onEdit, onDelete, onAdd, label, labels, empty, ...props }: FoodCatalogueProps) {
  const { ar, locale, t } = useStrings(labels);
  const [confirm, setConfirm] = useState<FoodCatalogueItem>();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();

  const nameOf = useCallback((item: FoodCatalogueItem) => (ar && item.nameAr ? item.nameAr : item.name), [ar]);
  const familyName = useCallback(
    (id: string) => {
      const f = families.find((x) => x.id === id);
      return f ? (ar && f.nameAr ? f.nameAr : f.name) : id;
    },
    [families, ar],
  );
  const verdictLabel = { safe: t.verdictSafe, trigger: t.verdictTrigger, unreviewed: t.verdictUnreviewed };
  const sourceLabel = { none: t.sourceNone, you: t.sourceYou, catalogue: t.sourceCatalogue, clinician: t.sourceClinician };
  const kindLabel = { food: t.kindFood, drink: t.kindDrink };
  const counts = useMemo(() => verdictCounts(items), [items]);

  const verdictCell = (item: FoodCatalogueItem) => (
    <span className="flex flex-col items-start gap-0.5">
      <Status tone={verdictTone(item.verdict)} icon={VERDICT_ICON[item.verdict]}>
        {verdictLabel[item.verdict]}
      </Status>
      {item.verdict !== "unreviewed" && item.verdictSource ? <span className="text-caption text-muted-foreground">{sourceLabel[item.verdictSource]}</span> : null}
    </span>
  );
  const familiesCell = (item: FoodCatalogueItem) =>
    item.triggerFamilies?.length ? <TagList tags={item.triggerFamilies.map((id) => ({ id, label: familyName(id) }))} /> : <span className="text-muted-foreground">—</span>;

  const columns = [
    {
      id: "name",
      header: t.name,
      label: t.name,
      cell: (item: FoodCatalogueItem) => (
        <span className="flex min-w-0 items-center gap-2">
          {item.pinned ? <Pin aria-label={t.pinned} className="size-3.5 shrink-0 text-primary" /> : null}
          <UserText className="truncate text-label text-foreground">{nameOf(item)}</UserText>
        </span>
      ),
      sortValue: (item: FoodCatalogueItem) => nameOf(item),
      searchValue: (item: FoodCatalogueItem) => `${item.name} ${item.nameAr ?? ""} ${item.note ?? ""}`,
    },
    { id: "kind", header: t.kind, label: t.kind, cell: (item: FoodCatalogueItem) => kindLabel[item.kind], sortValue: (item: FoodCatalogueItem) => item.kind },
    { id: "verdict", header: t.verdict, label: t.verdict, cell: verdictCell, sortValue: (item: FoodCatalogueItem) => item.verdict },
    { id: "families", header: t.families, label: t.families, cell: familiesCell, hideable: true },
    {
      id: "note",
      header: t.note,
      label: t.note,
      cell: (item: FoodCatalogueItem) => (item.note ? <UserText className="line-clamp-2 text-body-sm text-muted-foreground">{item.note}</UserText> : <span className="text-muted-foreground">—</span>),
      defaultHidden: true,
    },
  ];

  const facets: EntityFacet<FoodCatalogueItem>[] = [
    {
      id: "verdict",
      title: t.verdict,
      options: (["safe", "trigger", "unreviewed"] as const).map((v) => ({ value: v, label: `${verdictLabel[v]} (${formatNumber(counts[v], locale)})` })),
      getValues: (item) => [item.verdict],
    },
    { id: "kind", title: t.kind, options: (["food", "drink"] as const).map((k) => ({ value: k, label: kindLabel[k] })), getValues: (item) => [item.kind] },
    ...(families.length ? [{ id: "family", title: t.families, options: families.map((f) => ({ value: f.id, label: ar && f.nameAr ? f.nameAr : f.name })), getValues: (item: FoodCatalogueItem) => [...(item.triggerFamilies ?? [])] }] : []),
  ];

  const rowActions = (item: FoodCatalogueItem) => [
    ...(onPin ? [{ id: "pin", label: item.pinned ? t.unpin : t.pin, icon: item.pinned ? PinOff : Pin, onSelect: () => void onPin(item, !item.pinned), group: "main" }] : []),
    ...(onEdit ? [{ id: "edit", label: t.edit, icon: Pencil, onSelect: () => onEdit(item), group: "main" }] : []),
    ...(onDelete ? [{ id: "delete", label: t.delete, icon: Trash2, danger: true, onSelect: () => (setFailure(undefined), setConfirm(item)), group: "danger" }] : []),
  ];

  const remove = async () => {
    if (!confirm || !onDelete) return;
    setBusy(true);
    setFailure(undefined);
    try {
      const result = await onDelete(confirm);
      if (result && typeof result === "object" && result.error) setFailure(result.error);
      else setConfirm(undefined);
    } catch {
      setFailure(t.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <EntityList<FoodCatalogueItem>
        data={[...items]}
        columns={columns}
        getRowId={(item) => item.id}
        rowLabel={nameOf}
        label={label ?? t.catalogue}
        facets={facets}
        selectable={false}
        searchPlaceholder={t.searchPlaceholder}
        defaultSort={{ id: "name", direction: "asc" }}
        rowActions={rowActions}
        toolbar={onAdd ? (
          <Button variant="primary" onClick={onAdd}>
            <Plus aria-hidden />
            {t.add}
          </Button>
        ) : undefined}
        empty={empty ?? <EmptyState icon={GlassWater} title={t.catalogueEmpty} description={t.catalogueEmptyHint} className="border-0" />}
        labels={labels as EntityListProps<FoodCatalogueItem>["labels"]}
        renderCard={(item) => (
          <div className="flex min-w-0 flex-col gap-2">
            <EntityIdentity className="pe-(--entity-card-controls)" name={nameOf(item)} subtitle={kindLabel[item.kind]} shape="square" avatarName={nameOf(item)} />
            <CardMeta label={t.verdict}>{verdictCell(item)}</CardMeta>
            {item.verdict === "unreviewed" ? <p className="text-caption text-muted-foreground">{t.unreviewedHint}</p> : null}
            {item.triggerFamilies?.length ? familiesCell(item) : null}
            {item.note ? <UserText block lines={2} className="text-body-sm text-muted-foreground">{item.note}</UserText> : null}
          </div>
        )}
        {...props}
      />
      <AlertDialog open={confirm !== undefined} onOpenChange={(open) => !open && !busy && setConfirm(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm ? fill(t.deleteTitle, { name: nameOf(confirm) }) : ""}</AlertDialogTitle>
            <AlertDialogDescription>{t.deleteBody}</AlertDialogDescription>
          </AlertDialogHeader>
          {failure ? (
            <p role="alert" className="text-caption text-nq-danger-text">
              {failure}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t.cancel}</AlertDialogCancel>
            <Button variant="danger" loading={busy} onClick={() => void remove()}>
              {t.delete}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ------------------------------------------------------------ FoodItemBuilder */

export interface FoodItemBuilderProps extends Omit<ComponentProps<typeof Card>, "children" | "onSubmit" | "title"> {
  /** Start values, for editing an existing item. Blank when omitted. */
  initial?: Partial<FoodDraft>;
  families: readonly FoodFamily[];
  /** Saves the item. Resolve with `{ error }` to keep the form open and show it. */
  onSave: (draft: FoodDraft) => Promise<HealthTrackerResult>;
  onCancel?: () => void;
  /** Heading. Default "New item" or "Edit item". */
  title?: ReactNode;
  editing?: boolean;
  labels?: HealthTrackersLabels;
}

const STEP_LABEL: Record<FoodDraftStep, "stepName" | "stepNameAr" | "stepVerdict" | "stepFamilies" | "stepNote"> = {
  name: "stepName",
  nameAr: "stepNameAr",
  verdict: "stepVerdict",
  families: "stepFamilies",
  note: "stepNote",
};

/**
 * Builds a catalogue item. The ring shows how complete the entry is (name, Arabic name, verdict, families, note) and
 * lists what is still missing. It measures the entry, never the food, and there is no calorie or portion field.
 */
export function FoodItemBuilder({ initial, families, onSave, onCancel, title, editing = false, labels, className, ...props }: FoodItemBuilderProps) {
  const { ar, locale, t } = useStrings(labels);
  const id = useId();
  const [draft, setDraft] = useState<FoodDraft>({ kind: "food", name: "", nameAr: "", verdict: "unreviewed", triggerFamilies: [], note: "", ...initial });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const set = <K extends keyof FoodDraft>(key: K, value: FoodDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const progress = foodDraftCompleteness(draft);
  const nameMissing = touched && !draft.name.trim();
  const familiesMissing = touched && draft.verdict === "trigger" && draft.triggerFamilies.length === 0;
  const tone = progress.score >= 1 ? "success" : progress.score >= 0.5 ? "info" : "neutral";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!foodDraftValid(draft)) return;
    setSaving(true);
    setError(undefined);
    try {
      const result = await onSave({ ...draft, name: draft.name.trim() });
      if (result && typeof result === "object" && result.error) setError(result.error);
    } catch {
      setError(t.actionFailed);
    } finally {
      setSaving(false);
    }
  };

  const toggleFamily = (familyId: string, on: boolean) => set("triggerFamilies", on ? [...draft.triggerFamilies, familyId] : draft.triggerFamilies.filter((f) => f !== familyId));

  const verdicts: [FoodVerdict, string][] = [
    ["unreviewed", t.verdictUnreviewed],
    ["safe", t.verdictSafe],
    ["trigger", t.verdictTrigger],
  ];

  return (
    <Card data-slot="food-item-builder" className={className} {...props}>
      <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-5">
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>{title ?? (editing ? t.builderEdit : t.builderNew)}</CardTitle>
            <CardDescription>
              {progress.missing.length ? `${t.builderMissingIntro}: ${progress.missing.map((s) => t[STEP_LABEL[s]]).join(ar ? "، " : ", ")}` : t.builderCompletenessLabel}
            </CardDescription>
          </div>
          <TimerRing fraction={progress.score} tone={tone} size={72} thickness={7} role="img" aria-label={`${t.builderCompletenessLabel}: ${fill(t.builderCompleteness, { done: formatNumber(progress.done, locale), total: formatNumber(progress.total, locale) })}`}>
            <span className="text-label tabular-nums text-foreground">{formatNumber(progress.score, locale, { style: "percent" })}</span>
          </TimerRing>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <fieldset className="flex gap-2" aria-label={t.kind}>
            {(["food", "drink"] as const).map((k) => (
              <Button key={k} type="button" size="sm" variant={draft.kind === k ? "primary" : "secondary"} aria-pressed={draft.kind === k} onClick={() => set("kind", k)}>
                {k === "food" ? t.kindFood : t.kindDrink}
              </Button>
            ))}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={nameMissing}>
              <FieldLabel>{t.name}</FieldLabel>
              <Input value={draft.name} onChange={(e) => set("name", e.target.value)} dir="auto" />
              {nameMissing ? <FieldError match>{t.builderNameRequired}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel>{t.builderNameAr}</FieldLabel>
              <Input value={draft.nameAr ?? ""} onChange={(e) => set("nameAr", e.target.value)} dir="rtl" lang="ar" />
              <FieldDescription>{t.builderNameArHint}</FieldDescription>
            </Field>
          </div>
          <div role="radiogroup" aria-label={t.builderVerdict} className="flex flex-col gap-2">
            <span className="text-label text-foreground">{t.builderVerdict}</span>
            <div className="flex flex-wrap gap-2">
              {verdicts.map(([v, text]) => {
                const Glyph = VERDICT_ICON[v];
                const active = draft.verdict === v;
                return (
                  <Button key={v} type="button" role="radio" aria-checked={active} variant={active ? "primary" : "secondary"} size="sm" onClick={() => set("verdict", v)}>
                    <Glyph aria-hidden />
                    {text}
                  </Button>
                );
              })}
            </div>
            {draft.verdict === "unreviewed" ? <p className="text-caption text-muted-foreground">{t.unreviewedHint}</p> : null}
          </div>
          {draft.verdict === "trigger" ? (
            <fieldset className="flex flex-col gap-2" aria-describedby={`${id}-fam`}>
              <legend className="text-label text-foreground">{t.builderFamilies}</legend>
              <p id={`${id}-fam`} className={cn("text-caption", familiesMissing ? "text-nq-danger-text" : "text-muted-foreground")} role={familiesMissing ? "alert" : undefined}>
                {familiesMissing ? t.builderFamiliesRequired : t.builderFamiliesHint}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {families.map((f) => (
                  <label key={f.id} className="inline-flex items-center gap-2 text-body-sm text-foreground">
                    <Checkbox checked={draft.triggerFamilies.includes(f.id)} onCheckedChange={(on) => toggleFamily(f.id, on === true)} />
                    <UserText>{ar && f.nameAr ? f.nameAr : f.name}</UserText>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <Field>
            <FieldLabel>{t.builderNote}</FieldLabel>
            <Textarea value={draft.note ?? ""} onChange={(e) => set("note", e.target.value)} rows={3} dir="auto" />
            <FieldDescription>{t.builderNoteHint}</FieldDescription>
          </Field>
          {error ? (
            <p role="alert" className="text-caption text-nq-danger-text">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            {onCancel ? (
              <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
                {t.cancel}
              </Button>
            ) : null}
            <Button type="submit" variant="primary" loading={saving}>
              {saving ? t.builderSaving : t.builderSave}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

/* ---------------------------------------------------------- FlaggedEntries */

export interface FlaggedEntry {
  id: string;
  /** When it was logged. */
  at: string | number | Date;
  /** What was logged. */
  label: string;
  /** Why it was flagged, in the server's own words. */
  reason: string;
  /** The engine or area it was flagged against, for example "Caffeine". */
  area?: string;
}

export interface FlaggedEntriesProps extends Omit<ComponentProps<"div">, "children"> {
  /** The count to show on the toggle before the list loads. Defaults to `entries.length`. */
  count?: number;
  /** The entries, when you already have them. */
  entries?: readonly FlaggedEntry[];
  /** Loads the entries the first time the disclosure opens (and on retry). Use instead of `entries`. */
  onLoad?: () => Promise<readonly FlaggedEntry[]>;
  defaultOpen?: boolean;
  labels?: HealthTrackersLabels;
}

/**
 * The day's flagged entries behind a disclosure on the count. Flagged means recorded and then marked against the
 * protocol: the list explains why, and does not call them errors. Loads lazily when given `onLoad`.
 */
export function FlaggedEntries({ count, entries, onLoad, defaultOpen = false, labels, className, ...props }: FlaggedEntriesProps) {
  const { locale, t } = useStrings(labels);
  const [open, setOpen] = useState(defaultOpen);
  const [loaded, setLoaded] = useState<readonly FlaggedEntry[] | undefined>(entries);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const started = useRef(false);
  useEffect(() => setLoaded(entries), [entries]);

  const load = useCallback(async () => {
    if (!onLoad) return;
    setState("loading");
    try {
      setLoaded(await onLoad());
      setState("idle");
    } catch {
      setState("error");
    }
  }, [onLoad]);

  useEffect(() => {
    if (open && onLoad && !started.current) {
      started.current = true;
      void load();
    }
  }, [open, onLoad, load]);

  const total = loaded?.length ?? count ?? 0;
  return (
    <Collapsible open={open} onOpenChange={setOpen} data-slot="flagged-entries" className={cn("min-w-0", className)} {...props}>
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-control border border-border px-3 py-2 text-start text-label text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
        <span className="flex items-center gap-2">
          <Flag aria-hidden className="size-4 text-nq-warning-text" />
          {t.flaggedTitle}
          <Badge variant={total > 0 ? "warning" : "neutral"}>{fill(t.flaggedCount, { count: formatNumber(total, locale) })}</Badge>
        </span>
        <ChevronDown aria-hidden className={cn("size-4 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="flex flex-col gap-3 px-1 pt-3">
          {state === "loading" ? (
            <div role="status" aria-label={t.flaggedLoading} className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : state === "error" ? (
            <p role="alert" className="flex flex-wrap items-center gap-2 text-caption text-nq-danger-text">
              {t.flaggedFailed}
              <Button variant="link" size="sm" onClick={() => void load()}>
                {t.retry}
              </Button>
            </p>
          ) : loaded && loaded.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">{t.flaggedNone}</p>
          ) : (
            <>
              <p className="text-caption text-muted-foreground">{t.flaggedIntro}</p>
              <ul className="flex flex-col divide-y divide-border rounded-control border border-border">
                {loaded?.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-0.5 px-3 py-2">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <UserText className="text-label text-foreground">{entry.label}</UserText>
                      <DateTime value={entry.at} format={{ timeStyle: "short" }} className="text-caption tabular-nums text-muted-foreground" />
                    </span>
                    <span className="text-body-sm text-muted-foreground">
                      {entry.area ? <span className="text-foreground">{entry.area}: </span> : null}
                      <UserText>{entry.reason}</UserText>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}
