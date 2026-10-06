"use client";

import { Brain, CircleAlert, CircleCheck, CirclePause, Globe, Loader, Lock, type LucideIcon, Users } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import type { DataTableColumn } from "../data-table";
import { ActivityCell, AvatarStack, type EntityFacet, EntityList, type EntityListProps, type EntityPerson, type EntityTag, TagList } from "../entity-list";
import { DateTime, formatNumber } from "../numeric";
import { EmptyState } from "../states";
import { Status, type StatusTone } from "../status";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    label: "Brains",
    search: "Search brains…",
    name: "Brain",
    status: "Status",
    visibility: "Access",
    memories: "Memories",
    sources: "Sources",
    chats: "Chats",
    members: "Members",
    tags: "Tags",
    model: "Model",
    lastActive: "Last active",
    statuses: { ready: "Ready", indexing: "Indexing", paused: "Paused", error: "Needs attention" },
    visibilities: { private: "Private", team: "Team", public: "Public" },
    empty: "No brains yet",
    emptyHint: "Create a brain to give your team a shared memory.",
  },
  ar: {
    label: "العقول",
    search: "ابحث في العقول…",
    name: "العقل",
    status: "الحالة",
    visibility: "الوصول",
    memories: "الذكريات",
    sources: "المصادر",
    chats: "المحادثات",
    members: "الأعضاء",
    tags: "الوسوم",
    model: "النموذج",
    lastActive: "آخر نشاط",
    statuses: { ready: "جاهز", indexing: "قيد الفهرسة", paused: "متوقف", error: "يحتاج إلى انتباه" },
    visibilities: { private: "خاص", team: "الفريق", public: "عام" },
    empty: "لا توجد عقول بعد",
    emptyHint: "أنشئ عقلًا ليكون لفريقك ذاكرة مشتركة.",
  },
};
export type BrainListLabels = Omit<typeof STRINGS.en, "statuses" | "visibilities"> & {
  statuses: Record<BrainStatus, string>;
  visibilities: Record<BrainVisibility, string>;
};
type BrainLabelOverrides = Partial<Omit<BrainListLabels, "statuses" | "visibilities">> & {
  statuses?: Partial<BrainListLabels["statuses"]>;
  visibilities?: Partial<BrainListLabels["visibilities"]>;
};

/* ------------------------------------------------------------------ types */

export type BrainStatus = "ready" | "indexing" | "paused" | "error";
export type BrainVisibility = "private" | "team" | "public";

export interface BrainSummary {
  id: string;
  name: string;
  /** One or two lines on what the brain knows. */
  description?: string;
  /** An emoji or an image URL shown as the brain's mark. Falls back to a brain icon. */
  avatar?: string;
  /** Brand colour for the mark (any CSS colour): tints its tile and border. */
  color?: string;
  status: BrainStatus;
  visibility: BrainVisibility;
  /** Facts, notes and documents retained. */
  memories: number;
  /** Connected data sources. */
  sources: number;
  /** Conversations held. */
  chats?: number;
  /** Model name such as "claude-sonnet". Shown left-to-right. */
  model?: string;
  members?: EntityPerson[];
  tags?: EntityTag[];
  lastActive?: Date | string | number | null;
}

const STATUS_VIEW: Record<BrainStatus, { tone: StatusTone; icon: LucideIcon }> = {
  ready: { tone: "success", icon: CircleCheck },
  indexing: { tone: "info", icon: Loader },
  paused: { tone: "neutral", icon: CirclePause },
  error: { tone: "danger", icon: CircleAlert },
};
const STATUS_ORDER = Object.keys(STATUS_VIEW) as BrainStatus[];

const VISIBILITY_VIEW: Record<BrainVisibility, LucideIcon> = { private: Lock, team: Users, public: Globe };
const VISIBILITY_ORDER = Object.keys(VISIBILITY_VIEW) as BrainVisibility[];

function useBrainStrings(labels?: BrainLabelOverrides) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const t = { ...base, ...labels, statuses: { ...base.statuses, ...labels?.statuses }, visibilities: { ...base.visibilities, ...labels?.visibilities } };
  return { locale, t };
}

function BrainMark({ brain, size = "md" }: { brain: BrainSummary; size?: "md" | "lg" }) {
  const isImage = brain.avatar?.startsWith("http") || brain.avatar?.startsWith("/") || brain.avatar?.startsWith("data:");
  return (
    <span
      aria-hidden
      style={brain.color ? { backgroundColor: `color-mix(in srgb, ${brain.color} 16%, transparent)`, borderColor: `color-mix(in srgb, ${brain.color} 45%, transparent)` } : undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary text-foreground",
        size === "lg" ? "size-11 text-h3" : "size-9 text-body",
      )}
    >
      {isImage ? <img src={brain.avatar} alt="" className="size-full object-cover" /> : (brain.avatar ?? <Brain className={size === "lg" ? "size-5" : "size-4"} />)}
    </span>
  );
}

/* ------------------------------------------------------------------ BrainCard */

export interface BrainCardProps {
  brain: BrainSummary;
  /** Extra content at the bottom of the card, such as buttons. */
  footer?: ReactNode;
  labels?: BrainLabelOverrides;
  className?: string;
}

/** One brain as a card: mark, name, description, status, access, counts and members. `BrainList` uses it for its card view. */
export function BrainCard({ brain, footer, labels, className }: BrainCardProps) {
  const { locale, t } = useBrainStrings(labels);
  const VisIcon = VISIBILITY_VIEW[brain.visibility];
  const counts = [
    { key: "m", label: t.memories, value: brain.memories },
    { key: "s", label: t.sources, value: brain.sources },
    { key: "c", label: t.chats, value: brain.chats },
  ];
  return (
    <div data-slot="brain-card" className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex min-w-0 items-start gap-3 pe-(--entity-card-controls)">
        <BrainMark brain={brain} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-label text-foreground">{brain.name}</span>
          {brain.description ? <span className="line-clamp-2 text-body-sm text-muted-foreground">{brain.description}</span> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Status tone={STATUS_VIEW[brain.status].tone} icon={STATUS_VIEW[brain.status].icon}>
          {t.statuses[brain.status]}
        </Status>
        <Badge variant="outline">
          <VisIcon aria-hidden />
          {t.visibilities[brain.visibility]}
        </Badge>
      </div>
      <dl className="grid w-full grid-cols-3 gap-1 rounded-control bg-secondary px-1 py-2 text-center">
        {counts.map(({ key, label, value }) => (
          <div key={key} className="flex min-w-0 flex-col items-center gap-0.5">
            <dt className="flex max-w-full items-center gap-1 text-caption text-muted-foreground">
              <span className="truncate" title={label}>{label}</span>
            </dt>
            <dd className="text-label tabular-nums text-foreground">{value == null ? "—" : formatNumber(value, locale, { notation: "compact" })}</dd>
          </div>
        ))}
      </dl>
      {brain.tags?.length ? <TagList tags={brain.tags} /> : null}
      <div className="flex items-center justify-between gap-2">
        <AvatarStack people={brain.members ?? []} />
        {brain.lastActive != null ? <DateTime value={brain.lastActive} format={{ dateStyle: "medium" }} className="text-caption text-muted-foreground" /> : null}
      </div>
      {footer}
    </div>
  );
}

/* ------------------------------------------------------------------ BrainList */

export interface BrainListProps extends Omit<EntityListProps<BrainSummary>, "data" | "columns" | "getRowId" | "renderCard" | "label" | "facets" | "labels"> {
  brains: BrainSummary[];
  /** The list's accessible name. Default "Brains" / "العقول". */
  label?: string;
  /** Override any built-in string, including status and access names. */
  labels?: BrainLabelOverrides & EntityListProps<BrainSummary>["labels"];
}

/**
 * Zekra-style list of brains as a table or as cards: status, access, memory / source / chat counts, members, tags
 * and last activity, with search, filters and bulk select. Built on `EntityList`.
 */
export function BrainList({ brains, label, labels, empty, ...props }: BrainListProps) {
  const { locale, t } = useBrainStrings(labels);
  const labelKey = JSON.stringify(labels);

  const columns = useMemo<DataTableColumn<BrainSummary>[]>(
    () => [
      {
        id: "name",
        header: t.name,
        hideable: false,
        cell: (b) => (
          <span className="flex min-w-0 items-center gap-3">
            <BrainMark brain={b} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-label text-foreground">{b.name}</span>
              {b.description ? <span className="truncate text-body-sm text-muted-foreground">{b.description}</span> : null}
            </span>
          </span>
        ),
        sortValue: (b) => b.name,
        searchValue: (b) => `${b.name} ${b.description ?? ""} ${b.model ?? ""}`,
        className: "min-w-64",
      },
      {
        id: "status",
        header: t.status,
        cell: (b) => (
          <Status tone={STATUS_VIEW[b.status].tone} icon={STATUS_VIEW[b.status].icon}>
            {t.statuses[b.status]}
          </Status>
        ),
        sortValue: (b) => STATUS_ORDER.indexOf(b.status),
      },
      {
        id: "visibility",
        header: t.visibility,
        cell: (b) => {
          const I = VISIBILITY_VIEW[b.visibility];
          return (
            <span className="inline-flex items-center gap-1.5 text-body-sm">
              <I className="size-3.5 text-muted-foreground" aria-hidden />
              {t.visibilities[b.visibility]}
            </span>
          );
        },
        sortValue: (b) => VISIBILITY_ORDER.indexOf(b.visibility),
      },
      { id: "memories", header: t.memories, align: "end", cell: (b) => <span className="tabular-nums">{formatNumber(b.memories, locale)}</span>, sortValue: (b) => b.memories },
      { id: "sources", header: t.sources, align: "end", cell: (b) => <span className="tabular-nums">{formatNumber(b.sources, locale)}</span>, sortValue: (b) => b.sources },
      {
        id: "chats",
        header: t.chats,
        align: "end",
        cell: (b) => <span className="tabular-nums">{b.chats == null ? "—" : formatNumber(b.chats, locale)}</span>,
        sortValue: (b) => b.chats ?? 0,
        defaultHidden: true,
      },
      { id: "members", header: t.members, cell: (b) => <AvatarStack people={b.members ?? []} /> },
      {
        id: "model",
        header: t.model,
        cell: (b) => (b.model ? <bdi dir="ltr" className="font-mono text-code">{b.model}</bdi> : "—"),
        sortValue: (b) => b.model,
        defaultHidden: true,
      },
      { id: "tags", header: t.tags, cell: (b) => <TagList tags={b.tags ?? []} />, defaultHidden: true },
      {
        id: "lastActive",
        header: t.lastActive,
        cell: (b) => <ActivityCell value={b.lastActive} />,
        sortValue: (b) => (b.lastActive == null ? null : new Date(b.lastActive)),
        align: "end",
      },
    ],
    // `t` is rebuilt every render; its values only change with the locale or the labels.
    [locale, labelKey],
  );

  const facets = useMemo<EntityFacet<BrainSummary>[]>(() => {
    const tags = new Set<string>();
    for (const b of brains) for (const tag of b.tags ?? []) tags.add(tag.label);
    return [
      {
        id: "status",
        title: t.status,
        options: STATUS_ORDER.map((s) => ({ value: s, label: t.statuses[s], icon: STATUS_VIEW[s].icon })),
        getValues: (b: BrainSummary) => [b.status],
      },
      {
        id: "visibility",
        title: t.visibility,
        options: VISIBILITY_ORDER.map((v) => ({ value: v, label: t.visibilities[v], icon: VISIBILITY_VIEW[v] })),
        getValues: (b: BrainSummary) => [b.visibility],
      },
      {
        id: "tags",
        title: t.tags,
        options: [...tags].sort((a, b) => a.localeCompare(b, locale)).map((v) => ({ value: v, label: v })),
        getValues: (b: BrainSummary) => (b.tags ?? []).map((tag) => tag.label),
      },
    ].filter((f) => f.options.length > 0);
  }, [brains, locale, labelKey]);

  return (
    <EntityList<BrainSummary>
      data={brains}
      columns={columns}
      getRowId={(b) => b.id}
      rowLabel={(b) => b.name}
      label={label ?? t.label}
      facets={facets}
      searchPlaceholder={t.search}
      defaultSort={{ id: "lastActive", direction: "desc" }}
      empty={empty ?? <EmptyState icon={Brain} title={t.empty} description={t.emptyHint} className="border-0" />}
      labels={labels as EntityListProps<BrainSummary>["labels"]}
      renderCard={(b) => <BrainCard brain={b} labels={labels} />}
      {...props}
    />
  );
}
