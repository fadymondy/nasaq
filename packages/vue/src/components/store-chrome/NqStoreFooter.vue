<script setup lang="ts">
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqInputGroup, NqInputGroupInput } from "../input-group";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { useStoreChromeStrings, type StoreChromeLabels } from "./strings";
import type { StoreFooterColumn, StoreFooterOption, StoreFooterSocial } from "./types";

// The storefront footer: link columns, newsletter sign-up with validation and a live result, payment marks slot, text
// social links, and language and currency switches. Slots: brand, tagline, payments, legal.
const props = withDefaults(
  defineProps<{
    columns?: readonly StoreFooterColumn[];
    /** Adds the newsletter form. Resolves when subscribed; reject to show the failure message. */
    onSubscribe?: (email: string) => void | Promise<void>;
    social?: readonly StoreFooterSocial[];
    languages?: readonly StoreFooterOption[];
    language?: string;
    currencies?: readonly StoreFooterOption[];
    currency?: string;
    labels?: StoreChromeLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { columns: () => [], onSubscribe: undefined, social: () => [], languages: undefined, language: undefined, currencies: undefined, currency: undefined, labels: undefined },
);
const emit = defineEmits<{ "update:language": [value: string]; "update:currency": [value: string] }>();

const { t } = useStoreChromeStrings(() => props.labels);
const uid = useId();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const email = ref("");
const state = ref<"idle" | "busy" | "done" | "failed" | "invalid">("idle");
const message = computed(() => (state.value === "done" ? t.value.subscribed : state.value === "invalid" ? t.value.invalidEmail : state.value === "failed" ? t.value.subscribeFailed : ""));
async function submit() {
  if (!EMAIL.test(email.value.trim())) {
    state.value = "invalid";
    return;
  }
  state.value = "busy";
  try {
    await props.onSubscribe?.(email.value.trim());
    state.value = "done";
    email.value = "";
  } catch {
    state.value = "failed";
  }
}
function onEmail(v: string | number | undefined) {
  email.value = String(v ?? "");
  if (state.value !== "busy") state.value = "idle";
}
const localLang = ref<string | undefined>(undefined);
const localCur = ref<string | undefined>(undefined);
const lang = computed(() => props.language ?? localLang.value);
const cur = computed(() => props.currency ?? localCur.value);
function pickLang(v: string | number | null) {
  if (v == null) return;
  localLang.value = String(v);
  emit("update:language", String(v));
}
function pickCur(v: string | number | null) {
  if (v == null) return;
  localCur.value = String(v);
  emit("update:currency", String(v));
}
const linkClass = "rounded-sm text-body-sm text-muted-foreground no-underline outline-none hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus";
</script>

<template>
  <footer data-slot="store-footer" :aria-label="t.footer" :class="cn('border-t border-border bg-nq-surface-soft', props.class)">
    <div class="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div class="flex flex-col gap-5">
        <div v-if="$slots.brand" class="text-h3 font-semibold text-foreground"><slot name="brand" /></div>
        <p v-if="$slots.tagline" class="max-w-sm text-body-sm text-muted-foreground"><slot name="tagline" /></p>
        <form v-if="props.onSubscribe" novalidate data-slot="store-newsletter" class="flex max-w-md flex-col gap-2" @submit.prevent="submit">
          <div>
            <p class="text-label text-foreground">{{ t.newsletterTitle }}</p>
            <p class="text-body-sm text-muted-foreground">{{ t.newsletterHint }}</p>
          </div>
          <div class="flex gap-2">
            <NqInputGroup class="flex-1" :aria-invalid="state === 'invalid' || undefined">
              <NqInputGroupInput
                :id="`${uid}-email`"
                type="email"
                ltr
                autocomplete="email"
                :aria-label="t.email"
                :aria-invalid="state === 'invalid' || undefined"
                :aria-describedby="`${uid}-msg`"
                :placeholder="t.emailPlaceholder"
                :model-value="email"
                @update:model-value="onEmail"
              />
            </NqInputGroup>
            <NqButton type="submit" variant="primary" :loading="state === 'busy'">{{ t.subscribe }}</NqButton>
          </div>
          <p :id="`${uid}-msg`" role="status" aria-live="polite" :class="cn('min-h-5 text-body-sm', state === 'done' ? 'text-nq-success-text' : 'text-nq-danger-text')">{{ message }}</p>
        </form>
      </div>
      <nav :aria-label="t.footer" class="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        <div v-for="col in props.columns" :key="col.title" class="flex min-w-0 flex-col gap-2.5">
          <h3 class="text-label text-foreground">{{ col.title }}</h3>
          <ul class="m-0 flex list-none flex-col gap-1.5 p-0">
            <li v-for="l in col.links" :key="l.href + l.label"><a :href="l.href" :class="linkClass">{{ l.label }}</a></li>
          </ul>
        </div>
      </nav>
    </div>
    <div class="border-t border-border">
      <div class="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-x-8 gap-y-5 px-4 py-6 sm:px-6">
        <div class="flex flex-wrap items-end gap-4">
          <label v-if="props.languages?.length" class="flex flex-col gap-1 text-caption text-muted-foreground">
            {{ t.language }}
            <NqSelect :model-value="lang" @update:model-value="pickLang">
              <NqSelectTrigger :aria-label="t.language" class="h-9 min-w-36"><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent><NqSelectItem v-for="o in props.languages" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem></NqSelectContent>
            </NqSelect>
          </label>
          <label v-if="props.currencies?.length" class="flex flex-col gap-1 text-caption text-muted-foreground">
            {{ t.currency }}
            <NqSelect :model-value="cur" @update:model-value="pickCur">
              <NqSelectTrigger :aria-label="t.currency" class="h-9 min-w-36"><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent><NqSelectItem v-for="o in props.currencies" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem></NqSelectContent>
            </NqSelect>
          </label>
        </div>
        <div v-if="$slots.payments" class="flex flex-col gap-1.5">
          <p class="text-caption text-muted-foreground">{{ t.paymentMethods }}</p>
          <div data-slot="store-footer-payments" class="flex flex-wrap items-center gap-2"><slot name="payments" /></div>
        </div>
        <nav v-if="props.social.length" :aria-label="t.followUs" class="flex flex-col gap-1.5">
          <p class="text-caption text-muted-foreground">{{ t.followUs }}</p>
          <ul class="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
            <li v-for="s in props.social" :key="s.href">
              <a :href="s.href" rel="noopener noreferrer" target="_blank" class="rounded-sm text-body-sm text-foreground underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">{{ s.label }}</a>
            </li>
          </ul>
        </nav>
      </div>
      <div v-if="$slots.legal" class="mx-auto w-full max-w-7xl px-4 pb-6 text-caption text-muted-foreground sm:px-6"><slot name="legal" /></div>
    </div>
  </footer>
</template>
