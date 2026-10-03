<script lang="ts">
import { Archive, CircleCheck, CircleDashed, CircleDot, CirclePause } from "lucide-vue-next";
import type { Component } from "vue";
import type { EntityPerson, EntityTag } from "../entity-list";
import type { ProgressTone } from "../progress";
import type { StatusTone } from "../status";

export const PROJECT_STRINGS = {
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

export type ProjectStatus = "planning" | "active" | "on-hold" | "completed" | "archived";
export type ProjectListLabels = Omit<typeof PROJECT_STRINGS.en, "statuses"> & { statuses: Record<ProjectStatus, string> };

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

const STATUS_VIEW: Record<ProjectStatus, { tone: StatusTone; icon: Component; progress: ProgressTone }> = {
  planning: { tone: "neutral", icon: CircleDashed, progress: "default" },
  active: { tone: "info", icon: CircleDot, progress: "info" },
  "on-hold": { tone: "warning", icon: CirclePause, progress: "warning" },
  completed: { tone: "success", icon: CircleCheck, progress: "success" },
  archived: { tone: "neutral", icon: Archive, progress: "default" },
};
const STATUS_ORDER = Object.keys(STATUS_VIEW) as ProjectStatus[];
</script>

<script setup lang="ts">
import { FolderKanban } from "lucide-vue-next";
import { computed, h } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import type { DataTableColumn } from "../data-table";
import { NqActivityCell, NqAvatarStack, NqCardMeta, NqEntityIdentity, NqEntityList, NqPersonCell, NqTagList, type EntityFacet, type EntityListContext } from "../entity-list";
import { formatNumber, NqDateTime } from "../numeric";
import { NqProgress } from "../progress";
import { NqEmptyState } from "../states";
import { NqStatus } from "../status";

// Projects as a table or as cards: status, progress, members, lead, due date and tags, with search, status / client /
// member / tag filters and bulk select. Built on NqEntityList: its other props and slots pass straight through.
const props = defineProps<{
  projects: Project[];
  /** The list's accessible name. Default "Projects" / "المشاريع". */
  label?: string;
  /** Override any built-in string, including the status names. */
  labels?: Partial<Omit<ProjectListLabels, "statuses">> & { statuses?: Partial<ProjectListLabels["statuses"]> } & Record<string, unknown>;
}>();
defineSlots<{ empty?: () => unknown; toolbar?: (p: EntityListContext<Project>) => unknown; bulk?: (p: EntityListContext<Project>) => unknown }>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => {
  const base = PROJECT_STRINGS[locale.value.startsWith("ar") ? "ar" : "en"];
  return { ...base, ...props.labels, statuses: { ...base.statuses, ...props.labels?.statuses } } as ProjectListLabels;
});

function isOverdue(p: Project) {
  return p.dueDate != null && p.status !== "completed" && p.status !== "archived" && new Date(p.dueDate).getTime() < Date.now();
}

const columns = computed<DataTableColumn<Project>[]>(() => {
  const s = t.value;
  const loc = locale.value;
  return [
    {
      id: "name",
      header: s.name,
      hideable: false,
      cell: (p) =>
        h(
          NqEntityIdentity,
          { avatarName: p.name, avatar: p.logo, shape: "square" },
          {
            default: () => p.name,
            ...(p.key || p.client
              ? { subtitle: () => [p.key ? h("bdi", { dir: "ltr" }, p.key) : null, p.key && p.client ? " · " : null, p.client] }
              : {}),
          },
        ),
      sortValue: (p) => p.name,
      searchValue: (p) => `${p.name} ${p.key ?? ""} ${p.client ?? ""}`,
      className: "min-w-56",
    },
    {
      id: "status",
      header: s.status,
      cell: (p) => h(NqStatus, { tone: STATUS_VIEW[p.status].tone, icon: STATUS_VIEW[p.status].icon }, () => s.statuses[p.status]),
      sortValue: (p) => STATUS_ORDER.indexOf(p.status),
    },
    {
      id: "progress",
      header: s.progress,
      cell: (p) =>
        h("span", { class: "flex w-36 items-center gap-2" }, [
          h(NqProgress, {
            value: p.progress / 100,
            max: 1,
            size: "sm",
            tone: STATUS_VIEW[p.status].progress,
            "aria-label": `${s.progress}: ${p.name}`,
            locale: loc,
            format: { style: "percent" },
            class: "flex-1",
          }),
          h("span", { class: "w-9 shrink-0 text-end text-caption tabular-nums text-muted-foreground" }, formatNumber(p.progress / 100, loc, { style: "percent" })),
        ]),
      sortValue: (p) => p.progress,
      className: "min-w-40",
    },
    { id: "members", header: s.members, cell: (p) => h(NqAvatarStack, { people: p.members ?? [] }) },
    { id: "owner", header: s.owner, cell: (p) => h(NqPersonCell, { person: p.owner }), sortValue: (p) => p.owner?.name, defaultHidden: true },
    {
      id: "due",
      header: s.due,
      cell: (p) =>
        p.dueDate == null
          ? h("span", { class: "text-muted-foreground" }, "—")
          : h("span", { class: cn("inline-flex items-center gap-1.5", isOverdue(p) && "text-nq-danger-text") }, [
              h(NqDateTime, { value: p.dueDate, format: { dateStyle: "medium" }, class: "text-body-sm" }),
              isOverdue(p) ? h("span", { class: "text-caption" }, s.overdue) : null,
            ]),
      sortValue: (p) => (p.dueDate == null ? null : new Date(p.dueDate)),
    },
    { id: "tags", header: s.tags, cell: (p) => h(NqTagList, { tags: p.tags ?? [] }), defaultHidden: true },
    {
      id: "lastActivity",
      header: s.lastActivity,
      cell: (p) => h(NqActivityCell, { value: p.lastActivity }),
      sortValue: (p) => (p.lastActivity == null ? null : new Date(p.lastActivity)),
      align: "end",
    },
  ];
});

const facets = computed<EntityFacet<Project>[]>(() => {
  const s = t.value;
  const clients = new Set<string>();
  const people = new Set<string>();
  const tags = new Set<string>();
  for (const p of props.projects) {
    if (p.client) clients.add(p.client);
    for (const m of p.members ?? []) people.add(m.name);
    for (const tag of p.tags ?? []) tags.add(tag.label);
  }
  const options = (set: Set<string>) => [...set].sort((a, b) => a.localeCompare(b, locale.value)).map((v) => ({ value: v, label: v }));
  return [
    {
      id: "status",
      title: s.status,
      options: STATUS_ORDER.map((k) => ({ value: k, label: s.statuses[k], icon: STATUS_VIEW[k].icon })),
      getValues: (p: Project) => [p.status],
    },
    { id: "client", title: s.client, options: options(clients), getValues: (p: Project) => (p.client ? [p.client] : []) },
    { id: "members", title: s.members, options: options(people), getValues: (p: Project) => (p.members ?? []).map((m) => m.name) },
    { id: "tags", title: s.tags, options: options(tags), getValues: (p: Project) => (p.tags ?? []).map((tag) => tag.label) },
  ].filter((f) => f.options.length > 0);
});
</script>

<template>
  <NqEntityList
    :data="props.projects"
    :columns="columns"
    :get-row-id="(p: Project) => p.id"
    :row-label="(p: Project) => p.name"
    :label="props.label ?? t.label"
    :facets="facets"
    :search-placeholder="t.search"
    :default-sort="{ id: 'lastActivity', direction: 'desc' }"
    :labels="props.labels as never"
  >
    <template #card="{ row: p }">
      <div class="flex min-w-0 flex-col gap-3">
        <NqEntityIdentity class="pe-(--entity-card-controls)" :avatar-name="p.name" :avatar="p.logo" shape="square" size="lg">
          {{ p.name }}
          <template #subtitle><template v-if="p.client">{{ p.client }}</template><bdi v-else-if="p.key" dir="ltr">{{ p.key }}</bdi></template>
        </NqEntityIdentity>
        <div class="flex flex-col gap-1.5">
          <NqCardMeta :label="t.status">
            <NqStatus :tone="STATUS_VIEW[p.status as ProjectStatus].tone" :icon="STATUS_VIEW[p.status as ProjectStatus].icon">{{ t.statuses[p.status as ProjectStatus] }}</NqStatus>
          </NqCardMeta>
          <NqProgress
            :value="p.progress / 100"
            :max="1"
            size="sm"
            :tone="STATUS_VIEW[p.status as ProjectStatus].progress"
            :aria-label="`${t.progress}: ${p.name}`"
            :locale="locale"
            :label="t.progress"
            :format="{ style: 'percent' }"
            class="py-1"
          />
          <NqCardMeta :label="t.due">
            <template v-if="p.dueDate == null">—</template>
            <NqDateTime v-else :value="p.dueDate" :format="{ dateStyle: 'medium' }" :class="isOverdue(p) ? 'text-nq-danger-text' : undefined" />
          </NqCardMeta>
          <NqCardMeta :label="t.members"><NqAvatarStack :people="p.members ?? []" /></NqCardMeta>
        </div>
        <NqTagList v-if="p.tags?.length" :tags="p.tags" />
      </div>
    </template>
    <template v-if="$slots.toolbar" #toolbar="ctx"><slot name="toolbar" v-bind="ctx" /></template>
    <template v-if="$slots.bulk" #bulk="ctx"><slot name="bulk" v-bind="ctx" /></template>
    <template #empty><slot name="empty"><NqEmptyState :icon="FolderKanban" :title="t.empty" :description="t.emptyHint" class="border-0" /></slot></template>
  </NqEntityList>
</template>
