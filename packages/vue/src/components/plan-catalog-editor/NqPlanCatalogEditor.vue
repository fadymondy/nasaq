<script setup lang="ts">
import { CircleAlert, CirclePlus, Pencil, Rocket, Trash2, Undo2 } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency, useNasaq } from "../../provider";
import { NqAdminPlans, type AdminPlanInput, type AdminTenantsLabels } from "../admin-tenants";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { formatNumber } from "../numeric";
import { NqRepeater } from "../repeater";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSkeleton } from "../states";
import { NqSwitch } from "../switch";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { CATALOG_ENTITIES, catalogIssues, countChanges, diffCatalog, makeId, type CatalogApp, type CatalogBundle, type CatalogChange, type CatalogEntity, type CatalogFeature, type PaygPrice, type PlanCatalog } from "./catalog-math";
import { planCatalogStrings, type PlanCatalogEditorLabels } from "./strings";
import type { CatalogApplyResult, CatalogPreviewResult } from "./types";

/**
 * The admin editor for a product catalog: plans (the AdminPlans cards and dialog), features, apps, pay-as-you-go
 * prices and bundles, all edited into a draft. Nothing is live until the sync preview, a dry run listing what will be
 * added, updated and removed, is applied. Persistence is yours: `onPreview` and `onApply` are async callbacks.
 */
const props = withDefaults(
  defineProps<{
    /** The catalog that is live. Pass a stable value; when its contents change the draft resets to it. */
    catalog: PlanCatalog;
    /** Runs the dry run on your backend. Optional: the editor diffs the draft against `catalog` itself. */
    onPreview?: (draft: PlanCatalog) => Promise<CatalogPreviewResult | void> | CatalogPreviewResult | void;
    /** Publishes the draft. Return `{ error }` (or throw) to keep the preview open. Without it the preview is read-only. */
    onApply?: (draft: PlanCatalog) => Promise<CatalogApplyResult> | CatalogApplyResult;
    /** Called on every edit of the draft. */
    onChange?: (draft: PlanCatalog) => void;
    /** ISO 4217 code for prices. Default USD, or SAR in Arabic. */
    currency?: string;
    /** Labels for the plan cards and plan dialog (AdminPlans). */
    planLabels?: AdminTenantsLabels;
    loading?: boolean;
    labels?: PlanCatalogEditorLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { loading: false },
);

const nq = useNasaq();
const currency = useCurrency(() => props.currency);
const t = computed(() => ({ ...planCatalogStrings(nq.locale.value), ...props.labels }));
const num = (n: number) => formatNumber(n, nq.locale.value);
const NO_APP = "__none__";

const signature = computed(() => JSON.stringify(props.catalog));
const live = ref<PlanCatalog>(props.catalog);
const draft = ref<PlanCatalog>(props.catalog);
watch(signature, () => {
  live.value = props.catalog;
  draft.value = props.catalog;
});

function update(patch: Partial<PlanCatalog>) {
  draft.value = { ...draft.value, ...patch };
  props.onChange?.(draft.value);
}
function discard() {
  draft.value = live.value;
  props.onChange?.(live.value);
}

const changes = computed(() => diffCatalog(live.value, draft.value));
const byEntity = (entity: CatalogEntity) => changes.value.filter((c) => c.entity === entity).length;
const tab = ref<CatalogEntity>("plans");
const notice = ref<string | null>(null);

/* -------- preview and apply */
const open = ref(false);
const previewing = ref(false);
const preview = ref<CatalogPreviewResult | null>(null);
const previewError = ref<string | null>(null);
const applying = ref(false);
const applyError = ref<string | null>(null);

async function openPreview() {
  open.value = true;
  preview.value = null;
  previewError.value = null;
  applyError.value = null;
  if (!props.onPreview) {
    preview.value = {};
    return;
  }
  previewing.value = true;
  try {
    const result = await props.onPreview(draft.value);
    if (result && result.error) previewError.value = result.error;
    else preview.value = result ?? {};
  } catch (e) {
    previewError.value = e instanceof Error && e.message ? e.message : t.value.previewFailed;
  }
  previewing.value = false;
}

const shown = computed<readonly CatalogChange[]>(() => preview.value?.changes ?? changes.value);
const issues = computed(() => catalogIssues(draft.value));
const counts = computed(() => countChanges(shown.value));

async function errorOf(fn: () => unknown): Promise<string | null> {
  try {
    const result = (await fn()) as { error?: string } | void;
    return result && typeof result === "object" && result.error ? result.error : null;
  } catch (e) {
    return e instanceof Error && e.message ? e.message : "";
  }
}
async function apply() {
  if (!props.onApply) return;
  applying.value = true;
  applyError.value = null;
  const failure = await errorOf(() => props.onApply!(draft.value));
  applying.value = false;
  if (failure !== null) {
    applyError.value = failure || t.value.applyFailed;
    return;
  }
  live.value = draft.value;
  open.value = false;
  notice.value = t.value.applied;
}

const entityLabel = (e: CatalogEntity) => t.value[e];
const issueText = (i: (typeof issues.value)[number]) => (i.code === "name" ? t.value.issueName : i.code === "duplicate" ? t.value.issueDuplicate : t.value.issueMissingApp)(entityLabel(i.entity), i.id);
const isLive = (entity: CatalogEntity, id: string) => (live.value[entity] as readonly { id: string }[]).some((r) => r.id === id);

/* -------- plans: share the AdminPlans cards and dialog */
function savePlan(values: AdminPlanInput) {
  const plans = [...draft.value.plans];
  const at = values.id ? plans.findIndex((p) => p.id === values.id) : -1;
  if (at >= 0) plans[at] = { ...plans[at]!, ...values, id: plans[at]!.id };
  else plans.push({ ...values, id: makeId(values.name, plans.map((p) => p.id), "plan"), subscribers: 0 });
  update({ plans });
}

const apps = computed(() => draft.value.apps as CatalogApp[]);
const features = computed(() => draft.value.features as CatalogFeature[]);
const payg = computed(() => draft.value.payg as PaygPrice[]);
const bundles = computed(() => draft.value.bundles as CatalogBundle[]);
const tabs = computed(() => CATALOG_ENTITIES.map((id) => ({ id, label: t.value[id] })));

const createFeature = (): CatalogFeature => ({ id: makeId("", features.value.map((f) => f.id), "feature"), name: "" });
const createApp = (): CatalogApp => ({ id: makeId("", apps.value.map((a) => a.id), "app"), name: "", enabled: true });
const createPayg = (): PaygPrice => ({ id: makeId("", payg.value.map((p) => p.id), "meter"), name: "", unit: "", unitPrice: 0 });
const createBundle = (): CatalogBundle => ({ id: makeId("", bundles.value.map((b) => b.id), "bundle"), name: "", price: 0, appIds: [] });
const numberOf = (v: unknown) => Number(v) || 0;
const textOf = (v: unknown) => String(v ?? "");
</script>

<template>
  <section data-slot="plan-catalog-editor" :aria-busy="props.loading || undefined" :class="cn('flex flex-col gap-4', props.class)">
    <div data-slot="plan-catalog-toolbar" class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-card px-4 py-3">
      <div role="status" class="flex items-center gap-2 text-body-sm">
        <template v-if="changes.length > 0">
          <Pencil aria-hidden="true" class="size-4 text-primary" />
          <span class="text-label text-foreground">{{ t.unpublished(num(changes.length)) }}</span>
        </template>
        <span v-else class="text-muted-foreground">{{ t.upToDate }}</span>
      </div>
      <div class="flex items-center gap-2">
        <NqButton variant="ghost" :disabled="changes.length === 0" @click="discard"><Undo2 />{{ t.discard }}</NqButton>
        <NqButton variant="primary" :disabled="changes.length === 0 || props.loading" @click="openPreview"><Rocket />{{ t.review }}</NqButton>
      </div>
    </div>

    <NqAlert v-if="notice" tone="success" dismissible :dismiss-label="t.dismiss" @dismiss="notice = null">{{ notice }}</NqAlert>

    <div v-if="props.loading" role="status" class="flex flex-col gap-3">
      <NqSkeleton class="h-8 w-72" />
      <NqSkeleton class="h-40 w-full" />
    </div>
    <NqTabs v-else :model-value="tab" @update:model-value="(v: string | number) => (tab = String(v) as CatalogEntity)">
      <NqTabsList variant="underline" :aria-label="t.tabs" class="gap-5">
        <NqTabsTab v-for="x in tabs" :key="x.id" :value="x.id">
          {{ x.label }}
          <NqBadge v-if="byEntity(x.id) > 0" variant="brand" :aria-label="t.unpublished(num(byEntity(x.id)))">{{ num(byEntity(x.id)) }}</NqBadge>
        </NqTabsTab>
        <NqTabsIndicator />
      </NqTabsList>

      <NqTabsPanel value="plans" class="flex flex-col gap-3">
        <p class="text-body-sm text-muted-foreground">{{ t.plansHint }}</p>
        <NqAdminPlans :plans="draft.plans" :currency="currency" :on-save-plan="savePlan" :labels="props.planLabels" />
      </NqTabsPanel>

      <NqTabsPanel value="features">
        <NqRepeater
          :model-value="features"
          :label="t.featuresList"
          :add-label="t.addFeature"
          :create-item="createFeature"
          :duplicable="false"
          :collapsible="false"
          :empty="t.empty"
          :row-title="(row: CatalogFeature, i: number) => row.name || `${t.feature} ${num(i + 1)}`"
          @update:model-value="(rows: CatalogFeature[]) => update({ features: rows })"
        >
          <template #default="{ item: row, update: set }">
            <div class="grid gap-3 sm:grid-cols-3">
              <NqField class="min-w-0">
                <NqFieldLabel>{{ t.featureName }}</NqFieldLabel>
                <NqInput :model-value="row.name" @update:model-value="set({ ...row, name: textOf($event) })" />
              </NqField>
              <NqField class="min-w-0">
                <NqFieldLabel>{{ t.featureId }}</NqFieldLabel>
                <NqInput ltr :model-value="row.id" :disabled="isLive('features', row.id)" @update:model-value="set({ ...row, id: textOf($event).trim() })" />
              </NqField>
              <NqField class="min-w-0">
                <NqFieldLabel>{{ t.featureApp }}</NqFieldLabel>
                <NqSelect :model-value="row.appId || NO_APP" @update:model-value="(v: string | number | null) => set({ ...row, appId: v && v !== NO_APP ? String(v) : undefined })">
                  <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
                  <NqSelectContent>
                    <NqSelectItem :value="NO_APP">{{ t.noApp }}</NqSelectItem>
                    <NqSelectItem v-for="a in apps" :key="a.id" :value="a.id">{{ a.name }}</NqSelectItem>
                  </NqSelectContent>
                </NqSelect>
              </NqField>
            </div>
          </template>
        </NqRepeater>
      </NqTabsPanel>

      <NqTabsPanel value="apps">
        <NqRepeater
          :model-value="apps"
          :label="t.appsList"
          :add-label="t.addApp"
          :create-item="createApp"
          :duplicable="false"
          :collapsible="false"
          :empty="t.empty"
          :row-title="(row: CatalogApp, i: number) => row.name || `${t.app} ${num(i + 1)}`"
          @update:model-value="(rows: CatalogApp[]) => update({ apps: rows })"
        >
          <template #default="{ item: row, update: set }">
            <div class="grid gap-3 sm:grid-cols-3">
              <NqField class="min-w-0">
                <NqFieldLabel>{{ t.appName }}</NqFieldLabel>
                <NqInput :model-value="row.name" @update:model-value="set({ ...row, name: textOf($event) })" />
              </NqField>
              <NqField class="min-w-0">
                <NqFieldLabel>{{ t.appId }}</NqFieldLabel>
                <NqInput ltr :model-value="row.id" :disabled="isLive('apps', row.id)" @update:model-value="set({ ...row, id: textOf($event).trim() })" />
              </NqField>
              <NqField class="flex-row items-center justify-between gap-3 self-end rounded-control border border-border px-3 py-2.5">
                <NqFieldLabel>{{ t.appEnabled }}</NqFieldLabel>
                <NqSwitch :model-value="row.enabled" :aria-label="t.appEnabled" @update:model-value="(on: boolean) => set({ ...row, enabled: on })" />
              </NqField>
            </div>
          </template>
        </NqRepeater>
      </NqTabsPanel>

      <NqTabsPanel value="payg">
        <NqRepeater
          :model-value="payg"
          :label="t.paygList"
          :add-label="t.addPayg"
          :create-item="createPayg"
          :duplicable="false"
          :collapsible="false"
          :empty="t.empty"
          :row-title="(row: PaygPrice, i: number) => row.name || `${t.payg1} ${num(i + 1)}`"
          @update:model-value="(rows: PaygPrice[]) => update({ payg: rows })"
        >
          <template #default="{ item: row, update: set }">
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <NqField class="min-w-0 lg:col-span-2">
                <NqFieldLabel>{{ t.paygName }}</NqFieldLabel>
                <NqInput :model-value="row.name" @update:model-value="set({ ...row, name: textOf($event) })" />
              </NqField>
              <NqField class="min-w-0">
                <NqFieldLabel>{{ t.paygId }}</NqFieldLabel>
                <NqInput ltr :model-value="row.id" :disabled="isLive('payg', row.id)" @update:model-value="set({ ...row, id: textOf($event).trim() })" />
              </NqField>
              <NqField class="min-w-0">
                <NqFieldLabel>{{ t.paygUnit }}</NqFieldLabel>
                <NqInput :model-value="row.unit" @update:model-value="set({ ...row, unit: textOf($event) })" />
              </NqField>
              <NqField class="min-w-0">
                <NqFieldLabel>{{ `${t.paygPrice} (${currency})` }}</NqFieldLabel>
                <NqInput ltr type="number" min="0" step="any" :model-value="row.unitPrice" @update:model-value="set({ ...row, unitPrice: numberOf($event) })" />
              </NqField>
              <NqField class="min-w-0">
                <NqFieldLabel>{{ t.paygFree }}</NqFieldLabel>
                <NqInput ltr type="number" min="0" step="any" :model-value="row.freeUnits ?? ''" @update:model-value="set({ ...row, freeUnits: $event === '' || $event === undefined ? undefined : numberOf($event) })" />
              </NqField>
            </div>
          </template>
        </NqRepeater>
      </NqTabsPanel>

      <NqTabsPanel value="bundles">
        <NqRepeater
          :model-value="bundles"
          :label="t.bundlesList"
          :add-label="t.addBundle"
          :create-item="createBundle"
          :duplicable="false"
          :collapsible="false"
          :empty="t.empty"
          :row-title="(row: CatalogBundle, i: number) => row.name || `${t.bundle} ${num(i + 1)}`"
          @update:model-value="(rows: CatalogBundle[]) => update({ bundles: rows })"
        >
          <template #default="{ item: row, update: set }">
            <div class="grid gap-3 sm:grid-cols-3">
              <NqField class="min-w-0">
                <NqFieldLabel>{{ t.bundleName }}</NqFieldLabel>
                <NqInput :model-value="row.name" @update:model-value="set({ ...row, name: textOf($event) })" />
              </NqField>
              <NqField class="min-w-0">
                <NqFieldLabel>{{ t.bundleId }}</NqFieldLabel>
                <NqInput ltr :model-value="row.id" :disabled="isLive('bundles', row.id)" @update:model-value="set({ ...row, id: textOf($event).trim() })" />
              </NqField>
              <NqField class="min-w-0">
                <NqFieldLabel>{{ `${t.bundlePrice} (${currency})` }}</NqFieldLabel>
                <NqInput ltr type="number" min="0" step="any" :model-value="row.price" @update:model-value="set({ ...row, price: numberOf($event) })" />
              </NqField>
              <div role="group" :aria-label="t.includedApps" class="flex flex-col gap-2 sm:col-span-3">
                <span class="text-label text-foreground">{{ t.includedApps }}</span>
                <div class="flex flex-wrap gap-x-5 gap-y-2">
                  <label v-for="a in apps" :key="a.id" class="inline-flex items-center gap-2 text-body-sm">
                    <NqCheckbox
                      :model-value="row.appIds.includes(a.id)"
                      @update:model-value="(on: boolean) => set({ ...row, appIds: on ? [...row.appIds, a.id] : row.appIds.filter((x: string) => x !== a.id) })"
                    />
                    {{ a.name }}
                  </label>
                </div>
              </div>
            </div>
          </template>
        </NqRepeater>
      </NqTabsPanel>
    </NqTabs>

    <NqDialog :open="open" @update:open="(o: boolean) => !applying && (open = o)">
      <NqDialogContent class="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <NqDialogHeader>
          <NqDialogTitle>{{ t.previewTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.previewBody }}</NqDialogDescription>
        </NqDialogHeader>
        <div data-slot="plan-catalog-preview" class="flex flex-col gap-4">
          <div v-if="previewing" role="status" :aria-label="t.previewLoading" class="flex flex-col gap-2">
            <NqSkeleton class="h-5 w-64" />
            <NqSkeleton class="h-16 w-full" />
          </div>
          <NqAlert v-else-if="previewError" tone="danger">{{ previewError || t.previewFailed }}</NqAlert>
          <template v-else>
            <p v-if="shown.length === 0" class="text-body-sm text-muted-foreground">{{ t.nothing }}</p>
            <template v-else>
              <p data-slot="plan-catalog-counts" class="text-label text-foreground">{{ t.counts(num(counts.added), num(counts.updated), num(counts.removed)) }}</p>
              <ul class="flex flex-col divide-y divide-border rounded-card border border-border">
                <li v-for="c in shown" :key="`${c.entity}:${c.id}:${c.kind}`" :data-kind="c.kind" class="flex items-start gap-3 px-3 py-2.5 text-body-sm">
                  <span class="mt-0.5 shrink-0">
                    <CirclePlus v-if="c.kind === 'added'" aria-hidden="true" class="size-4 text-nq-success-text" />
                    <Trash2 v-else-if="c.kind === 'removed'" aria-hidden="true" class="size-4 text-nq-danger-text" />
                    <Pencil v-else aria-hidden="true" class="size-4 text-nq-info-text" />
                  </span>
                  <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span class="flex flex-wrap items-center gap-2">
                      <span class="text-label text-foreground">{{ c.name || c.id }}</span>
                      <NqBadge :variant="c.kind === 'added' ? 'success' : c.kind === 'removed' ? 'danger' : 'info'">{{ t[c.kind] }}</NqBadge>
                      <span class="text-caption text-muted-foreground">{{ entityLabel(c.entity) }}</span>
                    </span>
                    <span v-if="c.fields?.length" class="text-caption text-muted-foreground">{{ t.fields }}: <bdi dir="ltr">{{ c.fields.join(", ") }}</bdi></span>
                  </div>
                </li>
              </ul>
            </template>
            <NqAlert v-if="preview?.warnings?.length" tone="warning" :title="t.warnings">
              <ul class="list-disc ps-4"><li v-for="w in preview.warnings" :key="w">{{ w }}</li></ul>
            </NqAlert>
            <NqAlert v-if="issues.length" tone="danger" :title="t.issues" :icon="CircleAlert">
              <ul class="list-disc ps-4"><li v-for="i in issues" :key="`${i.entity}:${i.id}:${i.code}`">{{ issueText(i) }}</li></ul>
            </NqAlert>
          </template>
          <NqAlert v-if="applyError" tone="danger">{{ applyError }}</NqAlert>
        </div>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="applying" @click="open = false">{{ t.cancel }}</NqButton>
          <NqButton v-if="props.onApply" type="button" variant="primary" :loading="applying" :disabled="previewing || !!previewError || shown.length === 0 || issues.length > 0" @click="apply">
            {{ shown.length === 1 ? t.applyOne : t.apply(num(shown.length)) }}
          </NqButton>
        </NqDialogFooter>
      </NqDialogContent>
    </NqDialog>
  </section>
</template>
