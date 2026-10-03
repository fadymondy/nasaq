<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqNum } from "../numeric";
import { usePersonalStrings, type PersonalWidgetLabels } from "./strings";
import type { ProfileStat } from "./types";

// Headline numbers: years of experience, projects shipped, articles written.
interface Props {
  stats: ProfileStat[];
  title?: string;
  labels?: PersonalWidgetLabels;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const { t } = usePersonalStrings(() => props.labels);
</script>

<template>
  <NqCard data-slot="stats-widget" :class="cn('gap-3', props.class)">
    <NqCardHeader><NqCardTitle>{{ props.title ?? t.stats }}</NqCardTitle></NqCardHeader>
    <NqCardContent>
      <dl class="grid grid-cols-2 gap-x-4 gap-y-3">
        <div v-for="s in props.stats" :key="s.label" class="flex flex-col">
          <dd class="order-first text-h1 text-foreground"><NqNum :value="s.value" :format="s.compact ? { notation: 'compact' } : undefined" />{{ s.suffix }}</dd>
          <dt class="text-caption text-muted-foreground">{{ s.label }}</dt>
        </div>
      </dl>
    </NqCardContent>
  </NqCard>
</template>
