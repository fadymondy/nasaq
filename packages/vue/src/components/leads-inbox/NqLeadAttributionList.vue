<script setup lang="ts">
import { computed } from "vue";
import { useNasaq } from "../../provider";
import { NqCopyButton } from "../copy-button";
import { leadAttributionEntries, type LeadAttribution } from "./leads-inbox-logic";
import { leadsInboxWords, type LeadsInboxLabelOverrides } from "./strings";

// The whole attribution as a small definition list. Values are LTR. Click ID and landing page can be copied.
const props = defineProps<{ attribution?: LeadAttribution; labels?: LeadsInboxLabelOverrides }>();
const nq = useNasaq();
const t = computed(() => leadsInboxWords(nq.locale.value, props.labels));
const entries = computed(() => leadAttributionEntries(props.attribution));
</script>

<template>
  <p v-if="!entries.length" class="text-body-sm text-muted-foreground">{{ t.direct }}</p>
  <dl v-else class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body-sm">
    <div v-for="e in entries" :key="e.key" class="contents">
      <dt class="text-muted-foreground">{{ t.attrKeys[e.key] }}</dt>
      <dd class="flex min-w-0 items-center gap-1.5">
        <bdi dir="ltr" class="min-w-0 break-all font-mono text-caption text-foreground">{{ e.value }}</bdi>
        <NqCopyButton v-if="e.key === 'gclid' || e.key === 'landingPage'" :value="e.value" :label="`${t.copy} ${t.attrKeys[e.key]}`" />
      </dd>
    </div>
  </dl>
</template>
