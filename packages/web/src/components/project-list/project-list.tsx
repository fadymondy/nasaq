"use client";

import { Archive, CircleCheck, CircleDashed, CircleDot, CirclePause, FolderKanban, type LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import type { DataTableColumn } from "../data-table";
import {
  ActivityCell,
  AvatarStack,
  CardMeta,
  EntityIdentity,
  type EntityFacet,
  EntityList,
  type EntityListProps,
  type EntityPerson,
  type EntityTag,
  PersonCell,
  TagList,
} from "../entity-list";
import { DateTime, formatNumber } from "../numeric";
import { Progress, type ProgressTone } from "../progress";
import { EmptyState } from "../states";
import { Status, type StatusTone } from "../status";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    label: "Projects",
    search: "Search projects…",
    name: "Project",
    client: "Client",
    status: "Status",
    progress: "Progress",
    members: "Members",
    owner: "Lead",
    due: "Due",
    tags: "Tags",
    lastActivity: "Last activity",
    overdue: "Overdue",
    noDue: "No due date",
    statuses: { planning: "Planning", active: "Active", "on-hold": "On hold", completed: "Completed", archived: "Archived" },
    empty: "No projects yet",
    emptyHint: "Create a project to start planning work.",
  },
  ar: {
    label: "المشاريع",
    search: "ابحث في المشاريع…",
    name: "المشروع",
    client: "العميل",
    status: "الحالة",
    progress: "التقدم",
    members: "الأعضاء",
    owner: "المسؤول",
    due: "الاستحقاق",
    tags: "الوسوم",
    lastActivity: "آخر نشاط",
    overdue: "متأخر",
    noDue: "بلا موعد",
    statuses: { planning: "قيد التخطيط", active: "نشط", "on-hold": "معلّق", completed: "مكتمل", archived: "مؤرشف" },
    empty: "لا توجد مشاريع بعد",
    emptyHint: "أنشئ مشروعًا لبدء تخطيط العمل.",
  },
};
export type ProjectListLabels = Omit<typeof STRINGS.en, "statuses"> & { statuses: Record<ProjectStatus, string> };

/* ------------------------------------------------------------------ types */

export type ProjectStatus = "planning" | "active" | "on-hold" | "completed" | "archived";

export interface Project {
  id: string;
  name: string;
  /** Short key such as "NSQ". Always shown left-to-right. */
  key?: string;
  /** Project icon or client logo. Shown square. */
  logo?: string;
  client?: string;
  status: ProjectStatus;
  /** 0 to 100. */
  progress: number;
  members?: EntityPerson[];
  /** The project lead. */
  owner?: EntityPerson;
  dueDate?: Date | string | number | null;
  tags?: EntityTag[];
  lastActivity?: Date | string | number | null;
}

const STATUS_VIEW: Record<ProjectStatus, { tone: StatusTone; icon: LucideIcon; progress: ProgressTone }> = {
  planning: { tone: "neutral", icon: CircleDashed, progress: "default" },
  active: { tone: "info", icon: CircleDot, progress: "info" },
  "on-hold": { tone: "warning", icon: CirclePause, progress: "warning" },
  completed: { tone: "success", icon: CircleCheck, progress: "success" },
  archived: { tone: "neutral", icon: Archive, progress: "default" },
};
const STATUS_ORDER = Object.keys(STATUS_VIEW) as ProjectStatus[];

export interface ProjectListProps
  extends Omit<EntityListProps<Project>, "data" | "columns" | "getRowId" | "renderCard" | "label" | "facets" | "labels"> {
  projects: Project[];
  /** The list's accessible name. Default "Projects" / "المشاريع". */
  label?: string;
  /** Override any built-in string, including the status names. */
  labels?: Partial<Omit<ProjectListLabels, "statuses">> & { statuses?: Partial<ProjectListLabels["statuses"]> } & EntityListProps<Project>["labels"];
}

/**
 * Projects as a table or as cards: status, progress, members, lead, due date and tags, with search, status / client /
 * member / tag filters and bulk select. Built on `EntityList` (and so on `DataTable`).
 */
export function ProjectList({ projects, label, labels, empty, ...props }: ProjectListProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const t = { ...base, ...labels, statuses: { ...base.statuses, ...labels?.statuses } };
  const labelKey = JSON.stringify(labels);

  const columns = useMemo<DataTableColumn<Project>[]>(() => {
    const now = Date.now();
    const overdue = (p: Project) => p.dueDate != null && p.status !== "completed" && p.status !== "archived" && new Date(p.dueDate).getTime() < now;
    const statusCell = (p: Project) => (
      <Status tone={STATUS_VIEW[p.status].tone} icon={STATUS_VIEW[p.status].icon}>
        {t.statuses[p.status]}
      </Status>
    );
    const progressCell = (p: Project, compact = false) => (
      <span className={cn("flex items-center gap-2", compact ? "w-full" : "w-36")}>
        <Progress
          value={p.progress / 100}
          max={1}
          size="sm"
          tone={STATUS_VIEW[p.status].progress}
          aria-label={`${t.progress}: ${p.name}`}
          locale={locale}
          format={{ style: "percent" }}
          className="flex-1"
        />
        <span className="w-9 shrink-0 text-end text-caption tabular-nums text-muted-foreground">{formatNumber(p.progress / 100, locale, { style: "percent" })}</span>
      </span>
    );
    const dueCell = (p: Project) =>
      p.dueDate == null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className={cn("inline-flex items-center gap-1.5", overdue(p) && "text-nq-danger-text")}>
          <DateTime value={p.dueDate} format={{ dateStyle: "medium" }} className="text-body-sm" />
          {overdue(p) ? <span className="text-caption">{t.overdue}</span> : null}
        </span>
      );
    return [
      {
        id: "name",
        header: t.name,
        hideable: false,
        cell: (p) => (
          <EntityIdentity
            name={p.name}
            avatarName={p.name}
            avatar={p.logo}
            shape="square"
            subtitle={p.key || p.client ? [p.key ? <bdi key="k" dir="ltr">{p.key}</bdi> : null, p.key && p.client ? " · " : null, p.client].filter(Boolean) : undefined}
          />
        ),
        sortValue: (p) => p.name,
        searchValue: (p) => `${p.name} ${p.key ?? ""} ${p.client ?? ""}`,
        className: "min-w-56",
      },
      { id: "status", header: t.status, cell: statusCell, sortValue: (p) => STATUS_ORDER.indexOf(p.status) },
      { id: "progress", header: t.progress, cell: (p) => progressCell(p), sortValue: (p) => p.progress, className: "min-w-40" },
      { id: "members", header: t.members, cell: (p) => <AvatarStack people={p.members ?? []} /> },
      { id: "owner", header: t.owner, cell: (p) => <PersonCell person={p.owner} />, sortValue: (p) => p.owner?.name, defaultHidden: true },
      { id: "due", header: t.due, cell: dueCell, sortValue: (p) => (p.dueDate == null ? null : new Date(p.dueDate)) },
      { id: "tags", header: t.tags, cell: (p) => <TagList tags={p.tags ?? []} />, defaultHidden: true },
      {
        id: "lastActivity",
        header: t.lastActivity,
        cell: (p) => <ActivityCell value={p.lastActivity} />,
        sortValue: (p) => (p.lastActivity == null ? null : new Date(p.lastActivity)),
        align: "end",
      },
    ];
    // `t` is rebuilt every render; its values only change with the locale or the labels.
  }, [locale, labelKey]);

  const facets = useMemo<EntityFacet<Project>[]>(() => {
    const clients = new Set<string>();
    const people = new Set<string>();
    const tags = new Set<string>();
    for (const p of projects) {
      if (p.client) clients.add(p.client);
      for (const m of p.members ?? []) people.add(m.name);
      for (const tag of p.tags ?? []) tags.add(tag.label);
    }
    const options = (set: Set<string>) => [...set].sort((a, b) => a.localeCompare(b, locale)).map((v) => ({ value: v, label: v }));
    return [
      {
        id: "status",
        title: t.status,
        options: STATUS_ORDER.map((s) => ({ value: s, label: t.statuses[s], icon: STATUS_VIEW[s].icon })),
        getValues: (p: Project) => [p.status],
      },
      { id: "client", title: t.client, options: options(clients), getValues: (p: Project) => (p.client ? [p.client] : []) },
      { id: "members", title: t.members, options: options(people), getValues: (p: Project) => (p.members ?? []).map((m) => m.name) },
      { id: "tags", title: t.tags, options: options(tags), getValues: (p: Project) => (p.tags ?? []).map((tag) => tag.label) },
    ].filter((f) => f.options.length > 0);
  }, [projects, locale, labelKey]);

  return (
    <EntityList<Project>
      data={projects}
      columns={columns}
      getRowId={(p) => p.id}
      rowLabel={(p) => p.name}
      label={label ?? t.label}
      facets={facets}
      searchPlaceholder={t.search}
      defaultSort={{ id: "lastActivity", direction: "desc" }}
      empty={empty ?? <EmptyState icon={FolderKanban} title={t.empty} description={t.emptyHint} className="border-0" />}
      labels={labels as EntityListProps<Project>["labels"]}
      renderCard={(p) => (
        <div className="flex min-w-0 flex-col gap-3">
          <EntityIdentity className="pe-(--entity-card-controls)"
            name={p.name}
            avatarName={p.name}
            avatar={p.logo}
            shape="square"
            size="lg"
            subtitle={p.client ?? (p.key ? <bdi dir="ltr">{p.key}</bdi> : undefined)}
          />
          <div className="flex flex-col gap-1.5">
            <CardMeta label={t.status}>
              <Status tone={STATUS_VIEW[p.status].tone} icon={STATUS_VIEW[p.status].icon}>
                {t.statuses[p.status]}
              </Status>
            </CardMeta>
            <Progress
              value={p.progress / 100}
          max={1}
              size="sm"
              tone={STATUS_VIEW[p.status].progress}
              aria-label={`${t.progress}: ${p.name}`}
              locale={locale}
              label={t.progress}
              format={{ style: "percent" }}
              className="py-1"
            />
            <CardMeta label={t.due}>
              {p.dueDate == null ? (
                "—"
              ) : (
                <DateTime value={p.dueDate} format={{ dateStyle: "medium" }} className={cn(p.status !== "completed" && p.status !== "archived" && new Date(p.dueDate).getTime() < Date.now() && "text-nq-danger-text")} />
              )}
            </CardMeta>
            <CardMeta label={t.members}>
              <AvatarStack people={p.members ?? []} />
            </CardMeta>
          </div>
          {p.tags?.length ? <TagList tags={p.tags} /> : null}
        </div>
      )}
      {...props}
    />
  );
}
