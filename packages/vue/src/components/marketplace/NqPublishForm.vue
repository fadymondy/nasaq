<script setup lang="ts">
import { Upload } from "lucide-vue-next";
import { computed, reactive, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import type { CatalogCategory } from "../catalog-store";
import { NqCheckbox } from "../checkbox";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { useFormatNumber } from "../numeric";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqTagInput } from "../tag-input";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { validateDraft, type PublishDraft, type PublishErrors } from "./marketplace-format";
import { riskVariant, useMarketplaceLabels, type MarketplaceLabels, type MarketplacePermission, type MarketplaceResult } from "./strings";

// The submission form for a new extension: identity, category, version, source, price, tags and permissions.
interface Props {
  categories: CatalogCategory[];
  /** Permissions the author can declare. */
  permissionOptions?: MarketplacePermission[];
  /** Send it for review. Resolve to finish; return `{ error }` to show why it failed. */
  onSubmit: (draft: PublishDraft) => Promise<MarketplaceResult>;
  onCancel?: () => void;
  /** Longest allowed summary. Default 140. */
  summaryMax?: number;
  class?: HTMLAttributes["class"];
  labels?: Partial<MarketplaceLabels>;
}
const props = withDefaults(defineProps<Props>(), { permissionOptions: () => [], onCancel: undefined, summaryMax: 140, labels: undefined });
const { t } = useMarketplaceLabels(() => props.labels);
const fmt = useFormatNumber();
const id = `nq-publish-${useId()}`;
const draft = reactive<PublishDraft>({ name: "", summary: "", description: "", category: "", version: "1.0.0", repository: "", price: 0, tags: [], permissions: [] });
const paid = ref(false);
const errors = ref<PublishErrors>({});
const pending = ref(false);
const formError = ref<string | null>(null);
const done = ref(false);
const err = (k: keyof PublishErrors) => (errors.value[k] ? t.value.errors[errors.value[k] as "required"] : undefined);
const items = computed(() => props.categories.map((c) => ({ value: c.id, label: c.label })));

async function submit() {
  const sent = { ...draft, tags: [...draft.tags], permissions: [...draft.permissions], price: paid.value ? draft.price : 0 };
  const found = validateDraft(sent, props.summaryMax);
  errors.value = found;
  if (Object.keys(found).length > 0) return;
  pending.value = true;
  formError.value = null;
  try {
    const res = await props.onSubmit(sent);
    if (res && res.error) formError.value = res.error;
    else done.value = true;
  } catch {
    formError.value = t.value.failed;
  } finally {
    pending.value = false;
  }
}
function setPermission(permId: string, on: boolean) {
  draft.permissions = on ? [...draft.permissions, permId] : draft.permissions.filter((x) => x !== permId);
}
</script>

<template>
  <div v-if="done" data-slot="publish-form" :class="cn('flex flex-col gap-3', props.class)">
    <p role="status" class="rounded-card border border-border bg-card p-4 text-body text-foreground">{{ t.submitted }}</p>
    <div v-if="props.onCancel">
      <NqButton variant="secondary" @click="props.onCancel">{{ t.cancel }}</NqButton>
    </div>
  </div>
  <form v-else data-slot="publish-form" novalidate :class="cn('flex min-w-0 flex-col gap-4', props.class)" @submit.prevent="submit">
    <div class="grid gap-4 sm:grid-cols-2">
      <NqField :invalid="!!errors.name">
        <NqFieldLabel>{{ t.name }}</NqFieldLabel>
        <NqInput v-model="draft.name" required autocomplete="off" />
        <NqFieldError v-if="errors.name" match>{{ err("name") }}</NqFieldError>
      </NqField>
      <NqField :invalid="!!errors.category">
        <NqFieldLabel>{{ t.categoryLabel }}</NqFieldLabel>
        <NqSelect :model-value="draft.category || null" @update:model-value="(v: string | number | null) => (draft.category = v == null ? '' : String(v))">
          <NqSelectTrigger :invalid="!!errors.category">
            <NqSelectValue :placeholder="t.categoryPlaceholder" />
          </NqSelectTrigger>
          <NqSelectContent>
            <NqSelectItem v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
          </NqSelectContent>
        </NqSelect>
        <NqFieldError v-if="errors.category" match>{{ err("category") }}</NqFieldError>
      </NqField>
    </div>
    <NqField :invalid="!!errors.summary">
      <NqFieldLabel>{{ t.summary }}</NqFieldLabel>
      <NqInput v-model="draft.summary" />
      <NqFieldDescription>
        {{ t.summaryHint(fmt(props.summaryMax)) }} <bdi class="tabular-nums">{{ fmt(draft.summary.trim().length) }}</bdi>
      </NqFieldDescription>
      <NqFieldError v-if="errors.summary" match>{{ err("summary") }}</NqFieldError>
    </NqField>
    <NqField>
      <NqFieldLabel>{{ t.description }}</NqFieldLabel>
      <NqTextarea v-model="draft.description" :rows="4" />
    </NqField>
    <div class="grid gap-4 sm:grid-cols-2">
      <NqField :invalid="!!errors.version">
        <NqFieldLabel>{{ t.versionLabel }}</NqFieldLabel>
        <NqInput v-model="draft.version" ltr placeholder="1.0.0" />
        <NqFieldError v-if="errors.version" match>{{ err("version") }}</NqFieldError>
      </NqField>
      <NqField :invalid="!!errors.repository">
        <NqFieldLabel>{{ t.repository }}</NqFieldLabel>
        <NqInput v-model="draft.repository" ltr type="url" placeholder="https://github.com/acme/extension" />
        <NqFieldDescription>{{ t.repositoryHint }}</NqFieldDescription>
        <NqFieldError v-if="errors.repository" match>{{ err("repository") }}</NqFieldError>
      </NqField>
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <NqField>
        <NqFieldLabel>{{ t.pricing }}</NqFieldLabel>
        <NqToggleGroup :model-value="[paid ? 'paid' : 'free']" :aria-label="t.pricing" @update:model-value="(v: string[]) => v[0] && (paid = v[0] === 'paid')">
          <NqToggle value="free">{{ t.pricingFree }}</NqToggle>
          <NqToggle value="paid">{{ t.pricingPaid }}</NqToggle>
        </NqToggleGroup>
      </NqField>
      <NqField v-if="paid" :invalid="!!errors.price">
        <NqFieldLabel>{{ t.priceAmount }}</NqFieldLabel>
        <NqInput :model-value="draft.price" ltr type="number" min="0" step="0.5" @update:model-value="(v: string | number | undefined) => (draft.price = Number(v))" />
        <NqFieldError v-if="errors.price" match>{{ err("price") }}</NqFieldError>
      </NqField>
    </div>
    <div class="flex flex-col gap-1.5">
      <span :id="`${id}-tags`" class="text-label text-foreground">{{ t.tagsLabel }}</span>
      <NqTagInput v-model="draft.tags" :input-props="{ 'aria-labelledby': `${id}-tags` }" :placeholder="t.tagsPlaceholder" :max-tags="6" />
    </div>
    <fieldset v-if="props.permissionOptions.length" class="flex flex-col gap-2">
      <legend class="mb-1 text-label text-foreground">{{ t.permissionsLabel }}</legend>
      <ul class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
        <li v-for="p in props.permissionOptions" :key="p.id" class="flex items-start gap-3 px-3 py-2">
          <NqCheckbox :id="`${id}-${p.id}`" class="mt-0.5" :model-value="draft.permissions.includes(p.id)" @update:model-value="(on: boolean) => setPermission(p.id, on)" />
          <label :for="`${id}-${p.id}`" class="grid min-w-0 flex-1 cursor-pointer gap-0.5">
            <span dir="auto" class="text-body-sm text-foreground">{{ p.label }}</span>
            <span v-if="p.description" dir="auto" class="text-caption text-muted-foreground">{{ p.description }}</span>
          </label>
          <NqBadge :variant="riskVariant[p.risk ?? 'low']">{{ t.risk[p.risk ?? "low"] }}</NqBadge>
        </li>
      </ul>
    </fieldset>
    <p v-if="formError" role="alert" class="text-body-sm text-nq-danger-text">{{ formError }}</p>
    <div class="flex flex-wrap justify-end gap-2">
      <NqButton v-if="props.onCancel" type="button" variant="ghost" :disabled="pending" @click="props.onCancel">{{ t.cancel }}</NqButton>
      <NqButton type="submit" variant="primary" :loading="pending">
        <Upload aria-hidden="true" />
        {{ pending ? t.submitting : t.submit }}
      </NqButton>
    </div>
  </form>
</template>
