<script setup lang="ts">
import { computed } from "vue";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import type { LeadStatus } from "./leads-inbox-logic";
import { leadsInboxWords, type LeadsInboxLabelOverrides } from "./strings";
import { LEAD_STATUS_VARIANT } from "./types";

// The stage of a lead as a text badge.
const props = defineProps<{ status: LeadStatus; labels?: LeadsInboxLabelOverrides }>();
const nq = useNasaq();
const t = computed(() => leadsInboxWords(nq.locale.value, props.labels));
</script>

<template>
  <NqBadge :variant="LEAD_STATUS_VARIANT[props.status]">{{ t.statuses[props.status] }}</NqBadge>
</template>
