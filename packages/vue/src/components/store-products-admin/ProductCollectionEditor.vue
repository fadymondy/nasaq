<script setup lang="ts">
import { ArrowDown, ArrowUp, CircleX, FolderPlus, X } from "lucide-vue-next";
import { computed, ref } from "vue";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { NqNum } from "../numeric";
import { NqRuleBuilder } from "../rule-builder";
import { newGroup, type RuleDefinition, type RuleField } from "../rule-builder/rule-model";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState } from "../states";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import ProductAdminThumb from "./ProductAdminThumb.vue";
import { COLLECTION_FIELDS, type CollectionDef, type CollectionKind, matchCollection, moveItem } from "./product-admin-logic";
import type { CommerceProduct } from "./product-types";
import { useProductAdminStrings, type StoreProductsAdminLabels } from "./strings";

// The add/edit dialog of one collection: manual (pick and order products) or rule-based (a rule builder), with a live
// list of the matching products. Internal to NqCollectionsManager.
const EVENT = "product";
const ACTION = "add";
const toRule = (conditions: CollectionDef["conditions"]): RuleDefinition => ({ event: EVENT, conditions: conditions ?? newGroup("and"), actions: [{ id: "a-collection", type: ACTION, config: {} }] });

const props = defineProps<{ collection: CollectionDef; isNew: boolean; products: readonly CommerceProduct[]; currency: string; minorPerMajor: number; busy: boolean; error: string | null; labels?: StoreProductsAdminLabels }>();
const emit = defineEmits<{ cancel: []; save: [collection: CollectionDef] }>();
const { t, n } = useProductAdminStrings(() => props.labels);

const title = ref(props.collection.title);
const kind = ref<CollectionKind>(props.collection.kind);
const ids = ref<string[]>(props.collection.productIds ?? []);
const conditions = ref(props.collection.conditions ?? newGroup("and"));
const touched = ref(false);
const pick = ref<string | null>(null);

const draft = computed<CollectionDef>(() => ({ id: props.collection.id, title: title.value.trim(), kind: kind.value, ...(kind.value === "manual" ? { productIds: ids.value } : { conditions: conditions.value }) }));
const matches = computed(() => matchCollection(props.products, { kind: kind.value, productIds: ids.value, conditions: conditions.value }, { minorPerMajor: props.minorPerMajor, includeInactive: kind.value === "manual" }));
const fields = computed<RuleField[]>(() =>
  COLLECTION_FIELDS.map((id): RuleField => {
    const label = t.value.fields[id];
    if (id === "price" || id === "stock") return { id, label, kind: "number" };
    if (id === "onSale") return { id, label, kind: "boolean" };
    if (id === "status") return { id, label, kind: "select", options: (["active", "draft", "archived"] as const).map((s) => ({ value: s, label: t.value.statuses[s] })) };
    return { id, label, kind: "text" };
  }),
);
const ruleLabels = computed(() => ({
  when: t.value.ruleEventLabel,
  whenHelp: t.value.ruleEventHelp,
  ifTitle: t.value.ruleIfTitle,
  ifHelp: t.value.ruleIfHelp,
  thenTitle: t.value.ruleThenTitle,
  thenHelp: t.value.ruleThenHelp,
  noConditions: t.value.rulesHint,
  sentence: { when: (e: string) => `${t.value.ruleEventLabel} ${e}`, ifWord: t.value.ruleWhere, then: t.value.ruleSo, noConditions: t.value.matchNone, and: t.value.and, or: t.value.or },
}));
const byId = computed(() => new Map(props.products.map((p) => [p.id, p])));
const available = computed(() => props.products.filter((p) => !ids.value.includes(p.id)));
const invalid = computed(() => !title.value.trim());

function onPick(v: string | number | null) {
  if (v === null || v === "") return;
  ids.value = [...ids.value, String(v)];
  pick.value = null;
}
function submit() {
  touched.value = true;
  if (!invalid.value) emit("save", draft.value);
}
</script>

<template>
  <NqDialog :open="true" @update:open="(o: boolean) => !o && !props.busy && emit('cancel')">
    <NqDialogContent class="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
      <form class="grid gap-4" novalidate @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.isNew ? t.newCollection : props.collection.title || t.editCollection }}</NqDialogTitle>
          <NqDialogDescription>{{ kind === "manual" ? t.manualHint : t.rulesHint }}</NqDialogDescription>
        </NqDialogHeader>

        <NqField :invalid="touched && invalid">
          <NqFieldLabel>{{ t.collectionTitle }}</NqFieldLabel>
          <NqInput v-model="title" />
        </NqField>

        <NqTabs :model-value="kind" @update:model-value="(v) => (kind = String(v) as CollectionKind)">
          <NqTabsList :aria-label="t.kindLabel">
            <NqTabsTab value="manual">{{ t.manual }}</NqTabsTab>
            <NqTabsTab value="rules">{{ t.rules }}</NqTabsTab>
          </NqTabsList>
          <NqTabsPanel value="manual" class="grid gap-3 pt-3">
            <NqSelect :model-value="pick" @update:model-value="onPick">
              <NqSelectTrigger :aria-label="t.addProduct"><NqSelectValue :placeholder="t.pickProduct" /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="p in available" :key="p.id" :value="p.id">{{ p.name }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
            <NqEmptyState v-if="ids.length === 0" :icon="FolderPlus" :title="t.matchNone" class="border-dashed" />
            <ol v-else :aria-label="t.matchPreviewLabel" class="grid gap-1.5">
              <li v-for="(id, i) in ids" :key="id" class="flex min-w-0 items-center gap-2 rounded-control border border-border bg-card p-1.5">
                <ProductAdminThumb :src="byId.get(id)?.images[0]?.src" alt="" :size="32" />
                <span class="min-w-0 flex-1 truncate text-body-sm">{{ byId.get(id)?.name ?? id }}</span>
                <NqButton type="button" size="icon-sm" variant="ghost" :aria-label="t.moveUp" :disabled="i === 0" @click="ids = moveItem(ids, i, i - 1)">
                  <ArrowUp aria-hidden="true" />
                </NqButton>
                <NqButton type="button" size="icon-sm" variant="ghost" :aria-label="t.moveDown" :disabled="i === ids.length - 1" @click="ids = moveItem(ids, i, i + 1)">
                  <ArrowDown aria-hidden="true" />
                </NqButton>
                <NqButton type="button" size="icon-sm" variant="ghost" :aria-label="t.removeFromCollection" @click="ids = ids.filter((x) => x !== id)">
                  <X aria-hidden="true" />
                </NqButton>
              </li>
            </ol>
          </NqTabsPanel>
          <NqTabsPanel value="rules" class="grid gap-3 pt-3">
            <NqRuleBuilder
              :events="[{ id: EVENT, label: t.ruleAnyProduct }]"
              :fields="fields"
              :action-types="[{ id: ACTION, label: t.ruleAction }]"
              :model-value="toRule(conditions)"
              :labels="ruleLabels"
              @update:model-value="(r: RuleDefinition) => (conditions = r.conditions)"
            />
          </NqTabsPanel>
        </NqTabs>

        <div role="status" aria-live="polite" data-slot="collection-preview" class="grid gap-2 rounded-card border border-border bg-nq-surface-soft p-3">
          <p class="text-label text-foreground">{{ matches.length ? t.matchPreview(n(matches.length)) : t.matchNone }}</p>
          <ul v-if="matches.length > 0" :aria-label="t.matchPreviewLabel" class="grid gap-1 sm:grid-cols-2">
            <li v-for="p in matches.slice(0, 8)" :key="p.id" class="flex min-w-0 items-center gap-2 text-body-sm">
              <ProductAdminThumb :src="p.images[0]?.src" alt="" :size="24" />
              <span class="min-w-0 flex-1 truncate">{{ p.name }}</span>
              <span class="text-caption text-muted-foreground" dir="ltr">
                <NqNum v-if="p.variants[0]" :value="p.variants[0].price / props.minorPerMajor" :format="{ style: 'currency', currency: props.currency }" />
              </span>
            </li>
            <li v-if="matches.length > 8" class="text-caption text-muted-foreground">+{{ n(matches.length - 8) }}</li>
          </ul>
        </div>

        <p v-if="props.error" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
          <CircleX aria-hidden="true" class="size-4 shrink-0" />
          {{ props.error }}
        </p>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="props.busy" @click="emit('cancel')">{{ t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="props.busy">{{ t.saveCollection }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
