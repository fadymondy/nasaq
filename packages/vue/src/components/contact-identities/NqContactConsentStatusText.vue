<script setup lang="ts">
import { computed } from "vue";
import { NqBadge } from "../badge";
import { NqDateTime } from "../numeric";
import type { ContactConsent } from "./types";
import { useContactIdentitiesLabels, type ContactIdentitiesLabelOverrides } from "./strings";

// The consent line for one channel: the state as a word, and when and how it was given.
interface Props {
  consent?: ContactConsent;
  labels?: ContactIdentitiesLabelOverrides;
}
const props = defineProps<Props>();
const t = useContactIdentitiesLabels(() => props.labels);
const status = computed(() => props.consent?.status ?? "unknown");
const word = computed(() => (status.value === "granted" ? t.value.consentGranted : status.value === "denied" ? t.value.consentDenied : t.value.consentUnknown));
</script>

<template>
  <span class="flex min-w-0 flex-wrap items-center gap-x-1.5 text-caption text-muted-foreground">
    <NqBadge :variant="status === 'granted' ? 'success' : status === 'denied' ? 'danger' : 'outline'">{{ word }}</NqBadge>
    <span v-if="props.consent?.at">{{ t.since }} <NqDateTime :value="props.consent.at" /></span>
    <span v-if="props.consent?.source">{{ t.via }} {{ props.consent.source }}</span>
  </span>
</template>
