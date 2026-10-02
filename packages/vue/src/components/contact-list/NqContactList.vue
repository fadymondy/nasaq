<script lang="ts">
import type { EntityPerson, EntityTag } from "../entity-list";
import type { StatusTone } from "../status";

export const CONTACT_STRINGS = {
  en: {
    label: "Contacts",
    search: "Search contacts…",
    name: "Name",
    company: "Company",
    phone: "Phone",
    stage: "Stage",
    tags: "Tags",
    owner: "Owner",
    lastActivity: "Last activity",
    stages: { lead: "Lead", prospect: "Prospect", customer: "Customer", churned: "Churned" },
    unassigned: "Unassigned",
    empty: "No contacts yet",
    emptyHint: "Add a contact or import a list to get started.",
  },
  ar: {
    label: "جهات الاتصال",
    search: "ابحث في جهات الاتصال…",
    name: "الاسم",
    company: "الشركة",
    phone: "الهاتف",
    stage: "المرحلة",
    tags: "الوسوم",
    owner: "المسؤول",
    lastActivity: "آخر نشاط",
    stages: { lead: "عميل محتمل", prospect: "مهتم", customer: "عميل", churned: "منقطع" },
    unassigned: "غير معيّن",
    empty: "لا توجد جهات اتصال بعد",
    emptyHint: "أضف جهة اتصال أو استورد قائمة للبدء.",
  },
};

export type ContactStage = "lead" | "prospect" | "customer" | "churned";
export type ContactListLabels = Omit<typeof CONTACT_STRINGS.en, "stages"> & { stages: Record<ContactStage, string> };

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  /** Company name, shown as plain text. */
  company?: string;
  jobTitle?: string;
  stage?: ContactStage;
  tags?: EntityTag[];
  owner?: EntityPerson;
  lastActivity?: Date | string | number | null;
}

const STAGE_TONE: Record<ContactStage, StatusTone> = { lead: "info", prospect: "warning", customer: "success", churned: "neutral" };
const STAGE_ORDER: ContactStage[] = ["lead", "prospect", "customer", "churned"];
</script>

<script setup lang="ts">
import { Users } from "lucide-vue-next";
import { computed, h } from "vue";
import { useNasaq } from "../../provider";
import type { DataTableColumn } from "../data-table";
import { NqActivityCell, NqCardMeta, NqEntityIdentity, NqEntityList, NqPersonCell, NqTagList, type EntityFacet, type EntityListContext } from "../entity-list";
import { NqEmptyState } from "../states";
import { NqStatus } from "../status";

// Contacts as a table or as cards, with search, stage / tag / owner filters, bulk select, tags, owner and last
// activity. Built on NqEntityList: pass `rowActions`, `actions` and `onRowClick` to wire it up; its slots
// (`toolbar`, `bulk`, `empty`) pass straight through.
const props = defineProps<{
  contacts: Contact[];
  /** The list's accessible name. Default "Contacts" / "جهات الاتصال". */
  label?: string;
  /** Override any built-in string, including the stage names. */
  labels?: Partial<Omit<ContactListLabels, "stages">> & { stages?: Partial<ContactListLabels["stages"]> } & Record<string, unknown>;
}>();
defineSlots<{ empty?: () => unknown; toolbar?: (p: EntityListContext<Contact>) => unknown; bulk?: (p: EntityListContext<Contact>) => unknown }>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => {
  const base = CONTACT_STRINGS[locale.value.startsWith("ar") ? "ar" : "en"];
  return { ...base, ...props.labels, stages: { ...base.stages, ...props.labels?.stages } } as ContactListLabels;
});

const columns = computed<DataTableColumn<Contact>[]>(() => {
  const s = t.value;
  return [
    {
      id: "name",
      header: s.name,
      hideable: false,
      cell: (c) =>
        h(NqEntityIdentity, { avatarName: c.name, avatar: c.avatar }, { default: () => c.name, subtitle: () => h("bdi", { dir: "ltr" }, c.email) }),
      sortValue: (c) => c.name,
      searchValue: (c) => `${c.name} ${c.email} ${c.phone ?? ""} ${c.company ?? ""} ${c.jobTitle ?? ""}`,
      className: "min-w-56",
    },
    {
      id: "company",
      header: s.company,
      cell: (c) =>
        h("span", { class: "flex min-w-0 flex-col" }, [
          h("span", { class: "truncate" }, c.company ?? "—"),
          c.jobTitle ? h("span", { class: "truncate text-body-sm text-muted-foreground" }, c.jobTitle) : null,
        ]),
      sortValue: (c) => c.company,
    },
    { id: "phone", header: s.phone, cell: (c) => (c.phone ? h("bdi", { dir: "ltr", class: "tabular-nums" }, c.phone) : "—"), defaultHidden: true },
    {
      id: "stage",
      header: s.stage,
      cell: (c) => (c.stage ? h(NqStatus, { tone: STAGE_TONE[c.stage] }, () => s.stages[c.stage!]) : "—"),
      sortValue: (c) => (c.stage ? STAGE_ORDER.indexOf(c.stage) : null),
    },
    { id: "tags", header: s.tags, cell: (c) => h(NqTagList, { tags: c.tags ?? [] }) },
    { id: "owner", header: s.owner, cell: (c) => h(NqPersonCell, { person: c.owner }), sortValue: (c) => c.owner?.name },
    {
      id: "lastActivity",
      header: s.lastActivity,
      cell: (c) => h(NqActivityCell, { value: c.lastActivity }),
      sortValue: (c) => (c.lastActivity == null ? null : new Date(c.lastActivity)),
      align: "end",
    },
  ];
});

const facets = computed<EntityFacet<Contact>[]>(() => {
  const s = t.value;
  const tags = new Set<string>();
  const owners = new Set<string>();
  for (const c of props.contacts) {
    for (const tag of c.tags ?? []) tags.add(tag.label);
    if (c.owner) owners.add(c.owner.name);
  }
  const sorted = (set: Set<string>) => [...set].sort((a, b) => a.localeCompare(b, locale.value)).map((v) => ({ value: v, label: v }));
  return [
    { id: "stage", title: s.stage, options: STAGE_ORDER.map((k) => ({ value: k, label: s.stages[k] })), getValues: (c: Contact) => (c.stage ? [c.stage] : []) },
    { id: "tags", title: s.tags, options: sorted(tags), getValues: (c: Contact) => (c.tags ?? []).map((tag) => tag.label) },
    { id: "owner", title: s.owner, options: sorted(owners), getValues: (c: Contact) => (c.owner ? [c.owner.name] : []) },
  ].filter((f) => f.options.length > 0);
});
</script>

<template>
  <NqEntityList
    :data="props.contacts"
    :columns="columns"
    :get-row-id="(c: Contact) => c.id"
    :row-label="(c: Contact) => c.name"
    :label="props.label ?? t.label"
    :facets="facets"
    :search-placeholder="t.search"
    :default-sort="{ id: 'name', direction: 'asc' }"
    :labels="props.labels as never"
  >
    <template #card="{ row: c }">
      <div class="flex min-w-0 flex-col gap-3">
        <NqEntityIdentity class="pe-(--entity-card-controls)" :avatar-name="c.name" :avatar="c.avatar" size="lg">
          {{ c.name }}
          <template #subtitle>{{ c.jobTitle ?? c.company }}</template>
        </NqEntityIdentity>
        <bdi dir="ltr" class="truncate text-body-sm text-muted-foreground">{{ c.email }}</bdi>
        <div class="flex flex-col gap-1.5">
          <NqCardMeta v-if="c.stage" :label="t.stage"><NqStatus :tone="STAGE_TONE[c.stage as ContactStage]">{{ t.stages[c.stage as ContactStage] }}</NqStatus></NqCardMeta>
          <NqCardMeta v-if="c.company && c.jobTitle" :label="t.company">{{ c.company }}</NqCardMeta>
          <NqCardMeta :label="t.owner"><NqPersonCell :person="c.owner" /></NqCardMeta>
          <NqCardMeta :label="t.lastActivity"><NqActivityCell :value="c.lastActivity" /></NqCardMeta>
        </div>
        <NqTagList v-if="c.tags?.length" :tags="c.tags" />
      </div>
    </template>
    <template v-if="$slots.toolbar" #toolbar="ctx"><slot name="toolbar" v-bind="ctx" /></template>
    <template v-if="$slots.bulk" #bulk="ctx"><slot name="bulk" v-bind="ctx" /></template>
    <template #empty><slot name="empty"><NqEmptyState :icon="Users" :title="t.empty" :description="t.emptyHint" class="border-0" /></slot></template>
  </NqEntityList>
</template>
