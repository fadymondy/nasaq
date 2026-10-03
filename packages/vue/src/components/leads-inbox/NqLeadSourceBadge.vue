<script setup lang="ts">
import { computed } from "vue";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { classifyLeadSource, type LeadAttribution } from "./leads-inbox-logic";
import { leadsInboxWords, type LeadsInboxLabelOverrides } from "./strings";
import { LEAD_SOURCE_VARIANT } from "./types";

// Where a lead came from, as a text badge plus the campaign. Text, never colour alone.
const props = defineProps<{ attribution?: LeadAttribution; labels?: LeadsInboxLabelOverrides }>();
const nq = useNasaq();
const t = computed(() => leadsInboxWords(nq.locale.value, props.labels));
const src = computed(() => classifyLeadSource(props.attribution));
const detail = computed(() => [src.value.name, src.value.campaign].filter(Boolean).join(" · "));
</script>

<template>
  <span class="inline-flex min-w-0 items-center gap-1.5">
    <NqBadge :variant="LEAD_SOURCE_VARIANT[src.kind]">{{ t.sources[src.kind] }}</NqBadge>
    <bdi v-if="detail" dir="auto" class="truncate text-body-sm text-muted-foreground">{{ detail }}</bdi>
  </span>
</template>
