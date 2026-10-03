<script lang="ts">
import type { EntityPerson, EntityTag } from "../entity-list";

export const COMPANY_STRINGS = {
  en: {
    label: "Companies",
    search: "Search companies…",
    name: "Company",
    industry: "Industry",
    contacts: "Contacts",
    tags: "Tags",
    owner: "Owner",
    lastActivity: "Last activity",
    location: "Location",
    empty: "No companies yet",
    emptyHint: "Add a company or import a list to get started.",
  },
  ar: {
    label: "الشركات",
    search: "ابحث في الشركات…",
    name: "الشركة",
    industry: "المجال",
    contacts: "جهات الاتصال",
    tags: "الوسوم",
    owner: "المسؤول",
    lastActivity: "آخر نشاط",
    location: "الموقع",
    empty: "لا توجد شركات بعد",
    emptyHint: "أضف شركة أو استورد قائمة للبدء.",
  },
};
export type CompanyListLabels = typeof COMPANY_STRINGS.en;

export interface Company {
  id: string;
  name: string;
  /** Bare domain such as "acme.com". Always shown left-to-right. */
  domain?: string;
  /** Logo URL. Shown square and uncropped by a circle; the initials show until it loads. */
  logo?: string;
  industry?: string;
  location?: string;
  contactsCount: number;
  tags?: EntityTag[];
  owner?: EntityPerson;
  lastActivity?: Date | string | number | null;
}
</script>

<script setup lang="ts">
import { Building2 } from "lucide-vue-next";
import { computed, h } from "vue";
import { useNasaq } from "../../provider";
import type { DataTableColumn } from "../data-table";
import { NqActivityCell, NqCardMeta, NqEntityIdentity, NqEntityList, NqPersonCell, NqTagList, type EntityFacet, type EntityListContext } from "../entity-list";
import { formatNumber } from "../numeric";
import { NqEmptyState } from "../states";

// Companies as a table or as cards: logo, domain, contact count, industry, tags, owner and last activity, with search,
// industry / tag / owner filters and bulk select. Built on NqEntityList: its other props (`rowActions`, `actions`,
// `view`, `onRowClick`, …) and slots (`toolbar`, `bulk`, `empty`) pass straight through.
const props = defineProps<{
  companies: Company[];
  /** The list's accessible name. Default "Companies" / "الشركات". */
  label?: string;
  /** Override any built-in string. */
  labels?: Partial<CompanyListLabels> & Record<string, unknown>;
}>();
defineSlots<{ empty?: () => unknown; toolbar?: (p: EntityListContext<Company>) => unknown; bulk?: (p: EntityListContext<Company>) => unknown }>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => ({ ...COMPANY_STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }) as CompanyListLabels);

const columns = computed<DataTableColumn<Company>[]>(() => {
  const s = t.value;
  const loc = locale.value;
  return [
    {
      id: "name",
      header: s.name,
      hideable: false,
      cell: (c) =>
        h(
          NqEntityIdentity,
          { avatarName: c.name, avatar: c.logo, shape: "square" },
          { default: () => c.name, ...(c.domain ? { subtitle: () => h("bdi", { dir: "ltr" }, c.domain) } : {}) },
        ),
      sortValue: (c) => c.name,
      searchValue: (c) => `${c.name} ${c.domain ?? ""} ${c.industry ?? ""} ${c.location ?? ""}`,
      className: "min-w-56",
    },
    { id: "industry", header: s.industry, cell: (c) => c.industry ?? "—", sortValue: (c) => c.industry },
    { id: "location", header: s.location, cell: (c) => c.location ?? "—", defaultHidden: true },
    {
      id: "contacts",
      header: s.contacts,
      cell: (c) => h("span", { class: "tabular-nums" }, formatNumber(c.contactsCount, loc)),
      sortValue: (c) => c.contactsCount,
      align: "end",
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

const facets = computed<EntityFacet<Company>[]>(() => {
  const s = t.value;
  const industries = new Set<string>();
  const tags = new Set<string>();
  const owners = new Set<string>();
  for (const c of props.companies) {
    if (c.industry) industries.add(c.industry);
    for (const tag of c.tags ?? []) tags.add(tag.label);
    if (c.owner) owners.add(c.owner.name);
  }
  const options = (set: Set<string>) => [...set].sort((a, b) => a.localeCompare(b, locale.value)).map((v) => ({ value: v, label: v }));
  return [
    { id: "industry", title: s.industry, options: options(industries), getValues: (c: Company) => (c.industry ? [c.industry] : []) },
    { id: "tags", title: s.tags, options: options(tags), getValues: (c: Company) => (c.tags ?? []).map((tag) => tag.label) },
    { id: "owner", title: s.owner, options: options(owners), getValues: (c: Company) => (c.owner ? [c.owner.name] : []) },
  ].filter((f) => f.options.length > 0);
});
</script>

<template>
  <NqEntityList
    :data="props.companies"
    :columns="columns"
    :get-row-id="(c: Company) => c.id"
    :row-label="(c: Company) => c.name"
    :label="props.label ?? t.label"
    :facets="facets"
    :search-placeholder="t.search"
    :default-sort="{ id: 'name', direction: 'asc' }"
    :labels="props.labels as never"
  >
    <template #card="{ row: c }">
      <div class="flex min-w-0 flex-col gap-3">
        <NqEntityIdentity class="pe-(--entity-card-controls)" :avatar-name="c.name" :avatar="c.logo" shape="square" size="lg">
          {{ c.name }}
          <template #subtitle><bdi v-if="c.domain" dir="ltr">{{ c.domain }}</bdi><template v-else>{{ c.industry }}</template></template>
        </NqEntityIdentity>
        <div class="flex flex-col gap-1.5">
          <NqCardMeta v-if="c.industry" :label="t.industry">{{ c.industry }}</NqCardMeta>
          <NqCardMeta :label="t.contacts"><span class="tabular-nums">{{ formatNumber(c.contactsCount, locale) }}</span></NqCardMeta>
          <NqCardMeta :label="t.owner"><NqPersonCell :person="c.owner" /></NqCardMeta>
          <NqCardMeta :label="t.lastActivity"><NqActivityCell :value="c.lastActivity" /></NqCardMeta>
        </div>
        <NqTagList v-if="c.tags?.length" :tags="c.tags" />
      </div>
    </template>
    <template v-if="$slots.toolbar" #toolbar="ctx"><slot name="toolbar" v-bind="ctx" /></template>
    <template v-if="$slots.bulk" #bulk="ctx"><slot name="bulk" v-bind="ctx" /></template>
    <template #empty><slot name="empty"><NqEmptyState :icon="Building2" :title="t.empty" :description="t.emptyHint" class="border-0" /></slot></template>
  </NqEntityList>
</template>
