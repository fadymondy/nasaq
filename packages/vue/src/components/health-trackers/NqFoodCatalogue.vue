<script setup lang="ts">
import { CircleHelp, GlassWater, Pencil, Pin, PinOff, Plus, ShieldCheck, Trash2, TriangleAlert } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqButton } from "../button";
import type { DataTableColumn, DataTableRowAction } from "../data-table";
import { NqCardMeta, NqEntityIdentity, NqEntityList, NqTagList, type EntityFacet } from "../entity-list";
import { formatNumber } from "../numeric";
import { NqStatus } from "../status";
import { NqEmptyState } from "../states";
import { NqUserText } from "../text-utilities";
import { verdictCounts, verdictTone, type FoodVerdict } from "./health-trackers-logic";
import { healthFill, healthStrings, type FoodCatalogueItem, type FoodFamily, type HealthTrackerResult, type HealthTrackersLabels } from "./health-trackers-strings";

// The classified catalogue: every food and drink carries a verdict (safe, trigger or unreviewed), who decided it, its
// trigger families and the person's own note. Unreviewed is neutral and says so: it is never styled as safe. A table
// or cards with search and verdict, type and family filters; pin, edit and delete are row actions and also open from
// the context menu.
const props = withDefaults(
  defineProps<{
    items: readonly FoodCatalogueItem[];
    families?: readonly FoodFamily[];
    /** Pins or unpins an item. */
    onPin?: (item: FoodCatalogueItem, pinned: boolean) => Promise<HealthTrackerResult>;
    onEdit?: (item: FoodCatalogueItem) => void;
    /** Deletes an item after the person confirms. */
    onDelete?: (item: FoodCatalogueItem) => Promise<HealthTrackerResult>;
    onAdd?: () => void;
    label?: string;
    loading?: boolean;
    pageSize?: number;
    labels?: HealthTrackersLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { families: () => [], onPin: undefined, onEdit: undefined, onDelete: undefined, onAdd: undefined, label: undefined, loading: false, pageSize: undefined, labels: undefined },
);
defineSlots<{ empty?: () => unknown }>();

const VERDICT_ICON = { safe: ShieldCheck, trigger: TriangleAlert, unreviewed: CircleHelp } as const;

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const ar = computed(() => locale.value.startsWith("ar"));
const t = computed(() => healthStrings(locale.value, props.labels));
const confirm = ref<FoodCatalogueItem>();
// The last non-null target, so the dialog keeps its content while it animates out.
const held = ref<FoodCatalogueItem>();
const busy = ref(false);
const failure = ref<string>();

const nameOf = (item: FoodCatalogueItem) => (ar.value && item.nameAr ? item.nameAr : item.name);
const familyName = (id: string) => {
  const f = props.families.find((x) => x.id === id);
  return f ? (ar.value && f.nameAr ? f.nameAr : f.name) : id;
};
const verdictLabel = computed<Record<FoodVerdict, string>>(() => ({ safe: t.value.verdictSafe, trigger: t.value.verdictTrigger, unreviewed: t.value.verdictUnreviewed }));
const sourceLabel = computed(() => ({ none: t.value.sourceNone, you: t.value.sourceYou, catalogue: t.value.sourceCatalogue, clinician: t.value.sourceClinician }));
const kindLabel = computed(() => ({ food: t.value.kindFood, drink: t.value.kindDrink }));
const counts = computed(() => verdictCounts(props.items));
const rows = computed(() => [...props.items]);

const verdictCell = (item: FoodCatalogueItem) =>
  h("span", { class: "flex flex-col items-start gap-0.5" }, [
    h(NqStatus, { tone: verdictTone(item.verdict), icon: VERDICT_ICON[item.verdict] }, () => verdictLabel.value[item.verdict]),
    item.verdict !== "unreviewed" && item.verdictSource ? h("span", { class: "text-caption text-muted-foreground" }, sourceLabel.value[item.verdictSource]) : null,
  ]);
const familiesCell = (item: FoodCatalogueItem) =>
  item.triggerFamilies?.length ? h(NqTagList, { tags: item.triggerFamilies.map((id) => ({ label: familyName(id) })) }) : h("span", { class: "text-muted-foreground" }, "—");

const columns = computed<DataTableColumn<FoodCatalogueItem>[]>(() => {
  const s = t.value;
  return [
    {
      id: "name",
      header: s.name,
      label: s.name,
      cell: (item) =>
        h("span", { class: "flex min-w-0 items-center gap-2" }, [
          item.pinned ? h(Pin, { "aria-label": s.pinned, class: "size-3.5 shrink-0 text-primary" }) : null,
          h(NqUserText, { class: "truncate text-label text-foreground" }, () => nameOf(item)),
        ]),
      sortValue: (item) => nameOf(item),
      searchValue: (item) => `${item.name} ${item.nameAr ?? ""} ${item.note ?? ""}`,
    },
    { id: "kind", header: s.kind, label: s.kind, cell: (item) => kindLabel.value[item.kind], sortValue: (item) => item.kind },
    { id: "verdict", header: s.verdict, label: s.verdict, cell: verdictCell, sortValue: (item) => item.verdict },
    { id: "families", header: s.families, label: s.families, cell: familiesCell, hideable: true },
    {
      id: "note",
      header: s.note,
      label: s.note,
      cell: (item) => (item.note ? h(NqUserText, { class: "line-clamp-2 text-body-sm text-muted-foreground" }, () => item.note) : h("span", { class: "text-muted-foreground" }, "—")),
      defaultHidden: true,
    },
  ];
});

const facets = computed<EntityFacet<FoodCatalogueItem>[]>(() => [
  {
    id: "verdict",
    title: t.value.verdict,
    options: (["safe", "trigger", "unreviewed"] as const).map((v) => ({ value: v, label: `${verdictLabel.value[v]} (${formatNumber(counts.value[v], locale.value)})` })),
    getValues: (item) => [item.verdict],
  },
  { id: "kind", title: t.value.kind, options: (["food", "drink"] as const).map((k) => ({ value: k, label: kindLabel.value[k] })), getValues: (item) => [item.kind] },
  ...(props.families.length
    ? [{ id: "family", title: t.value.families, options: props.families.map((f) => ({ value: f.id, label: ar.value && f.nameAr ? f.nameAr : f.name })), getValues: (item: FoodCatalogueItem) => [...(item.triggerFamilies ?? [])] }]
    : []),
]);

const rowActions = (item: FoodCatalogueItem): DataTableRowAction[] => {
  const { onPin, onEdit, onDelete } = props;
  return [
    ...(onPin ? [{ id: "pin", label: item.pinned ? t.value.unpin : t.value.pin, icon: item.pinned ? PinOff : Pin, onSelect: () => void onPin(item, !item.pinned), group: "main" }] : []),
    ...(onEdit ? [{ id: "edit", label: t.value.edit, icon: Pencil, onSelect: () => onEdit(item), group: "main" }] : []),
    ...(onDelete
      ? [
          {
            id: "delete",
            label: t.value.delete,
            icon: Trash2,
            danger: true,
            onSelect: () => {
              failure.value = undefined;
              confirm.value = item;
              held.value = item;
            },
            group: "danger",
          },
        ]
      : []),
  ];
};

async function remove() {
  const target = confirm.value;
  if (!target || !props.onDelete) return;
  busy.value = true;
  failure.value = undefined;
  try {
    const result = await props.onDelete(target);
    if (result && typeof result === "object" && result.error) failure.value = result.error;
    else confirm.value = undefined;
  } catch {
    failure.value = t.value.actionFailed;
  } finally {
    busy.value = false;
  }
}

function onOpenChange(open: boolean) {
  if (!open && !busy.value) confirm.value = undefined;
}
</script>

<template>
  <div data-slot="food-catalogue" :class="props.class">
    <NqEntityList
      :data="rows"
      :columns="columns"
      :get-row-id="(item: FoodCatalogueItem) => item.id"
      :row-label="nameOf"
      :label="props.label ?? t.catalogue"
      :facets="facets"
      :selectable="false"
      :search-placeholder="t.searchPlaceholder"
      :default-sort="{ id: 'name', direction: 'asc' }"
      :row-actions="rowActions"
      :loading="props.loading"
      :page-size="props.pageSize"
    >
      <template v-if="props.onAdd" #toolbar>
        <NqButton variant="primary" @click="props.onAdd">
          <Plus aria-hidden="true" />
          {{ t.add }}
        </NqButton>
      </template>
      <template #card="{ row: item }">
        <div class="flex min-w-0 flex-col gap-2">
          <NqEntityIdentity class="pe-(--entity-card-controls)" :avatar-name="nameOf(item)" shape="square">
            {{ nameOf(item) }}
            <template #subtitle>{{ kindLabel[item.kind as FoodCatalogueItem["kind"]] }}</template>
          </NqEntityIdentity>
          <NqCardMeta :label="t.verdict"><component :is="() => verdictCell(item)" /></NqCardMeta>
          <p v-if="item.verdict === 'unreviewed'" class="text-caption text-muted-foreground">{{ t.unreviewedHint }}</p>
          <component :is="() => familiesCell(item)" v-if="item.triggerFamilies?.length" />
          <NqUserText v-if="item.note" block :lines="2" class="text-body-sm text-muted-foreground">{{ item.note }}</NqUserText>
        </div>
      </template>
      <template #empty>
        <slot name="empty"><NqEmptyState :icon="GlassWater" :title="t.catalogueEmpty" :description="t.catalogueEmptyHint" class="border-0" /></slot>
      </template>
    </NqEntityList>

    <NqAlertDialog :open="confirm !== undefined" @update:open="onOpenChange">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ held ? healthFill(t.deleteTitle, { name: nameOf(held) }) : "" }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.deleteBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <p v-if="failure" role="alert" class="text-caption text-nq-danger-text">{{ failure }}</p>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel :disabled="busy">{{ t.cancel }}</NqAlertDialogCancel>
          <NqButton variant="danger" :loading="busy" @click="remove">{{ t.delete }}</NqButton>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </div>
</template>
