<script setup lang="ts">
import { useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqBadge from "../badge/NqBadge.vue";
import type { ReleaseNote } from "./app-update-format";
import type { AppUpdateLabels } from "./strings";

// The "What is new" list. Internal to NqUpdateSheet and NqForcedUpdateGate.
interface Props {
  notes?: readonly ReleaseNote[];
  t: AppUpdateLabels;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const headingId = useId();
const noteType = (type: ReleaseNote["type"]) =>
  (({ new: ["info", props.t.typeNew], improved: ["accent", props.t.typeImproved], fixed: ["success", props.t.typeFixed] }) as const)[type];
</script>

<template>
  <section :aria-labelledby="headingId" :class="cn('flex flex-col gap-2', props.class)">
    <h3 :id="headingId" class="text-label text-foreground">{{ props.t.whatsNew }}</h3>
    <ul v-if="props.notes?.length" class="flex flex-col gap-2">
      <li v-for="(n, i) in props.notes" :key="i" class="flex items-start gap-2 text-body-sm text-nq-fg-body">
        <NqBadge :variant="noteType(n.type)[0]" class="mt-0.5 shrink-0">{{ noteType(n.type)[1] }}</NqBadge>
        <span dir="auto">{{ n.text }}</span>
      </li>
    </ul>
    <p v-else class="text-body-sm text-muted-foreground">{{ props.t.noNotes }}</p>
  </section>
</template>
