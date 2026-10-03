<script setup lang="ts">
import { MapPin, Pencil, Plus, Trash2 } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlertDialog, NqAlertDialogAction, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState, NqErrorState, NqSkeleton } from "../states";
import { addressLines, removeAddress, setDefaultAddress, upsertAddress, validateAddress, type AddressField } from "./account-logic";
import { useStoreAccountStrings, type StoreAccountLabels } from "./account-strings";
import type { CommerceAddress } from "./commerce";

// The address book: add, edit, set the default, delete. Validation comes from `validateAddress`, the book from the pure helpers.
const EMPTY: CommerceAddress = { name: "", phone: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "SA" };

const props = withDefaults(
  defineProps<{
    addresses: readonly CommerceAddress[];
    /** Called with the whole new book after every add, edit, default change or delete. */
    onChange?: (addresses: CommerceAddress[]) => void;
    /** ISO 3166-1 alpha-2 codes offered in the country field. */
    countries?: readonly string[];
    /** Id maker for new addresses. Default: `addr-<n>`. */
    makeId?: () => string;
    loading?: boolean;
    error?: boolean;
    onRetry?: () => void;
    labels?: StoreAccountLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { countries: () => ["SA", "AE", "EG", "KW", "QA", "BH", "OM", "JO"] },
);

const { t, locale } = useStoreAccountStrings(() => props.labels);
const draft = ref<CommerceAddress | null>(null);
const tried = ref(false);
const toDelete = ref<CommerceAddress | null>(null);
const names = computed(() => new Intl.DisplayNames([locale.value], { type: "region" }));
function country(code: string): string {
  try {
    return names.value.of(code) ?? code;
  } catch {
    return code;
  }
}
const problems = computed(() => (draft.value ? validateAddress(draft.value) : {}));
const err = (field: AddressField) => (tried.value && problems.value[field] ? (problems.value[field] === "required" ? t.value.required : t.value.invalid) : undefined);

// text fields in form order; line2 and region are optional and never show a problem
type TextField = { key: "name" | "phone" | "line1" | "line2" | "city" | "region" | "postalCode"; label: string; ltr?: boolean; auto: string; type?: string; wide?: boolean };
const textFields = computed<TextField[]>(() => [
  { key: "name", label: t.value.fullName, auto: "name", wide: true },
  { key: "phone", label: t.value.phone, ltr: true, auto: "tel", type: "tel", wide: true },
  { key: "line1", label: t.value.line1, auto: "address-line1", wide: true },
  { key: "line2", label: t.value.line2, auto: "address-line2", wide: true },
  { key: "city", label: t.value.city, auto: "address-level2" },
  { key: "region", label: t.value.region, auto: "address-level1" },
  { key: "postalCode", label: t.value.postalCode, ltr: true, auto: "postal-code" },
]);
const problemFor = (key: TextField["key"]) => (key === "line2" || key === "region" ? undefined : err(key));

const commit = (next: CommerceAddress[]) => props.onChange?.(next);
function save() {
  tried.value = true;
  if (!draft.value || Object.keys(validateAddress(draft.value)).length > 0) return;
  const clean: CommerceAddress = { ...draft.value };
  for (const key of ["phone", "line2", "region", "postalCode"] as const) if (!clean[key]?.trim()) delete clean[key];
  commit(upsertAddress(props.addresses, clean, props.makeId));
  draft.value = null;
}
function open(address: CommerceAddress) {
  tried.value = false;
  draft.value = { ...EMPTY, ...address };
}
function field(key: keyof CommerceAddress, value: string) {
  if (draft.value) draft.value = { ...draft.value, [key]: value };
}
function confirmDelete() {
  if (toDelete.value?.id) commit(removeAddress(props.addresses, toDelete.value.id));
  toDelete.value = null;
}
const dialogOpen = computed({ get: () => draft.value !== null, set: (o: boolean) => !o && (draft.value = null) });
const deleteOpen = computed({ get: () => toDelete.value !== null, set: (o: boolean) => !o && (toDelete.value = null) });
</script>

<template>
  <NqErrorState v-if="props.error" :title="t.loadError">
    <template v-if="props.onRetry" #actions>
      <NqButton size="sm" variant="secondary" @click="props.onRetry()">{{ t.retry }}</NqButton>
    </template>
  </NqErrorState>

  <section v-else data-slot="store-address-book" :aria-label="t.addressesTitle" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <NqButton variant="primary" size="sm" class="self-start" @click="open(EMPTY)">
      <Plus aria-hidden="true" />
      {{ t.addAddress }}
    </NqButton>

    <div v-if="props.loading" class="grid gap-3 sm:grid-cols-2" aria-busy="true">
      <NqSkeleton class="h-36" />
      <NqSkeleton class="h-36" />
    </div>
    <NqEmptyState v-else-if="props.addresses.length === 0" :icon="MapPin" :title="t.noAddresses" :description="t.noAddressesText" />
    <ul v-else class="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
      <li v-for="(a, i) in props.addresses" :key="a.id ?? i" :class="cn('flex flex-col gap-3 rounded-card border bg-card p-4', a.isDefault ? 'border-primary' : 'border-border')">
        <div class="flex items-start justify-between gap-2">
          <address class="flex min-w-0 flex-col gap-0.5 text-body-sm not-italic">
            <span class="font-medium">{{ a.name }}</span>
            <span v-for="(line, j) in addressLines(a)" :key="j" class="text-muted-foreground">{{ line }}</span>
            <span class="text-muted-foreground">{{ country(a.country) }}</span>
            <bdi v-if="a.phone" dir="ltr" class="text-start text-muted-foreground">{{ a.phone }}</bdi>
          </address>
          <NqBadge v-if="a.isDefault" variant="info">{{ t.defaultAddress }}</NqBadge>
        </div>
        <div class="mt-auto flex flex-wrap gap-2">
          <NqButton size="sm" variant="secondary" @click="open(a)">
            <Pencil aria-hidden="true" />
            {{ t.edit }}
          </NqButton>
          <NqButton v-if="!a.isDefault && a.id" size="sm" variant="ghost" @click="commit(setDefaultAddress(props.addresses, a.id))">{{ t.makeDefault }}</NqButton>
          <NqButton size="sm" variant="ghost" @click="toDelete = a">
            <Trash2 aria-hidden="true" />
            {{ t.delete }}
          </NqButton>
        </div>
      </li>
    </ul>

    <NqDialog v-model:open="dialogOpen">
      <NqDialogContent class="max-w-lg">
        <form v-if="draft" novalidate class="flex flex-col gap-4" @submit.prevent="save">
          <NqDialogHeader>
            <NqDialogTitle>{{ draft.id ? t.editAddress : t.newAddress }}</NqDialogTitle>
            <NqDialogDescription>{{ t.addressesTitle }}</NqDialogDescription>
          </NqDialogHeader>
          <div class="grid gap-3 sm:grid-cols-2">
            <label v-for="f in textFields" :key="f.key" :class="cn('flex flex-col gap-1.5 text-label text-foreground', f.wide && 'sm:col-span-2')">
              {{ f.label }}
              <NqInput :model-value="draft[f.key] ?? ''" :ltr="f.ltr" :type="f.type ?? 'text'" :autocomplete="f.auto" :aria-invalid="problemFor(f.key) ? true : undefined" @update:model-value="(v: string | number | undefined) => field(f.key, String(v ?? ''))" />
              <span v-if="problemFor(f.key)" role="alert" class="text-caption font-normal text-nq-danger-text">{{ problemFor(f.key) }}</span>
            </label>
            <label class="flex flex-col gap-1.5 text-label text-foreground">
              {{ t.country }}
              <NqSelect :model-value="draft.country || null" @update:model-value="(v: string | number | null) => v && field('country', String(v))">
                <NqSelectTrigger :aria-label="t.country">
                  <NqSelectValue :placeholder="t.country" />
                </NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem v-for="c in props.countries" :key="c" :value="c">{{ country(c) }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
            </label>
          </div>
          <label class="flex items-center gap-2 text-body-sm">
            <NqCheckbox :model-value="!!draft.isDefault" @update:model-value="(c: boolean) => draft && (draft = { ...draft, isDefault: c })" />
            {{ t.setDefaultCheck }}
          </label>
          <NqDialogFooter>
            <NqButton type="button" variant="ghost" @click="draft = null">{{ t.cancel }}</NqButton>
            <NqButton type="submit" variant="primary">{{ t.save }}</NqButton>
          </NqDialogFooter>
        </form>
      </NqDialogContent>
    </NqDialog>

    <NqAlertDialog v-model:open="deleteOpen">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ t.deleteTitle }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.deleteText }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel>{{ t.cancel }}</NqAlertDialogCancel>
          <NqAlertDialogAction variant="danger" @click="confirmDelete">{{ t.delete }}</NqAlertDialogAction>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </section>
</template>
