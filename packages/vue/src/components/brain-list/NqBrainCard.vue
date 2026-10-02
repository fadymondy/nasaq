<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqAvatarStack, NqTagList } from "../entity-list";
import { formatNumber, NqDateTime } from "../numeric";
import { NqStatus } from "../status";
import NqBrainMark from "./NqBrainMark.vue";
import { brainStrings, type BrainLabelOverrides } from "./strings";
import type { BrainSummary } from "./types";
import { BRAIN_STATUS_VIEW, BRAIN_VISIBILITY_VIEW } from "./view";

// One brain as a card: mark, name, description, status, access, counts and members. NqBrainList uses it for its card view.
// The `footer` slot adds content at the bottom, such as buttons.
const props = defineProps<{ brain: BrainSummary; labels?: BrainLabelOverrides; class?: HTMLAttributes["class"] }>();
defineSlots<{ footer?: () => unknown }>();
const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => brainStrings(locale.value, props.labels));
const counts = computed(() => [
  { key: "m", label: t.value.memories, value: props.brain.memories },
  { key: "s", label: t.value.sources, value: props.brain.sources },
  { key: "c", label: t.value.chats, value: props.brain.chats },
]);
const VisIcon = computed(() => BRAIN_VISIBILITY_VIEW[props.brain.visibility]);
</script>

<template>
  <div data-slot="brain-card" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <div class="flex min-w-0 items-start gap-3 pe-(--entity-card-controls)">
      <NqBrainMark :brain="props.brain" size="lg" />
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="truncate text-label text-foreground">{{ props.brain.name }}</span>
        <span v-if="props.brain.description" class="line-clamp-2 text-body-sm text-muted-foreground">{{ props.brain.description }}</span>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-1.5">
      <NqStatus :tone="BRAIN_STATUS_VIEW[props.brain.status].tone" :icon="BRAIN_STATUS_VIEW[props.brain.status].icon">{{ t.statuses[props.brain.status] }}</NqStatus>
      <NqBadge variant="outline">
        <component :is="VisIcon" aria-hidden="true" />
        {{ t.visibilities[props.brain.visibility] }}
      </NqBadge>
    </div>
    <dl class="grid w-full grid-cols-3 gap-1 rounded-control bg-secondary px-1 py-2 text-center">
      <div v-for="c in counts" :key="c.key" class="flex min-w-0 flex-col items-center gap-0.5">
        <dt class="flex max-w-full items-center gap-1 text-caption text-muted-foreground">
          <span class="truncate" :title="c.label">{{ c.label }}</span>
        </dt>
        <dd class="text-label tabular-nums text-foreground">{{ c.value == null ? "—" : formatNumber(c.value, locale, { notation: "compact" }) }}</dd>
      </div>
    </dl>
    <NqTagList v-if="props.brain.tags?.length" :tags="props.brain.tags" />
    <div class="flex items-center justify-between gap-2">
      <NqAvatarStack :people="props.brain.members ?? []" />
      <NqDateTime v-if="props.brain.lastActive != null" :value="props.brain.lastActive" :format="{ dateStyle: 'medium' }" class="text-caption text-muted-foreground" />
    </div>
    <slot name="footer" />
  </div>
</template>
