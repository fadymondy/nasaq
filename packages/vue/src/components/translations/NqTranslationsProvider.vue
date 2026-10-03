<script setup lang="ts">
import { computed, inject, onMounted, provide, watch } from "vue";
import { NASAQ_KEY } from "../../provider";
import { TRANSLATIONS_KEY, type TranslationsValue } from "./translations";
import { createTranslator, readStoredLocale, writeStoredLocale, type MessageBundle } from "./translations-logic";

// App strings for the Nasaq locale. It reads and drives `NasaqProvider`'s locale (so direction and the built-in
// component strings follow), restores the reader's stored choice on mount, and gives `useTranslations()` to everything below.
interface Props {
  /** Dictionaries by locale: `{ en: {...}, ar: {...} }`. Nested objects, `ns:key` and plural keys are supported. */
  messages: MessageBundle;
  /** Searched when a key is missing in the active locale. Default `"en"`. */
  fallbackLocale?: string;
  /** Where the reader's choice is remembered. `null` turns persistence off. Default `"nasaq-locale"`. */
  storageKey?: string | null;
  /** Used when there is no `NasaqProvider` above. Default `"en"`. */
  locale?: string;
}
const props = withDefaults(defineProps<Props>(), { fallbackLocale: "en", storageKey: "nasaq-locale", locale: "en" });

const nq = inject(NASAQ_KEY, null);
const locale = computed(() => nq?.locale.value ?? props.locale);

// Restore the stored choice once per storage key; later changes come from setLocale.
function restore() {
  const stored = readStoredLocale(props.storageKey);
  if (stored && stored !== locale.value) nq?.setLocale(stored);
}
onMounted(restore);
watch(() => props.storageKey, restore);

const value = computed<TranslationsValue>(() => ({
  t: createTranslator(props.messages, locale.value, props.fallbackLocale),
  locale: locale.value,
  setLocale(next) {
    writeStoredLocale(props.storageKey, next);
    nq?.setLocale(next);
  },
  seedLocale(next) {
    if (readStoredLocale(props.storageKey) === null) nq?.setLocale(next);
  },
  hasStoredLocale: () => readStoredLocale(props.storageKey) !== null,
}));
provide(TRANSLATIONS_KEY, { get value() { return value.value; } });
</script>

<template>
  <slot />
</template>
