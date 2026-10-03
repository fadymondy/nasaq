<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { formatNumber } from "../numeric";
import { groupSkills } from "./personal-model";
import { fill, usePersonalStrings, type PersonalWidgetLabels } from "./strings";
import type { Skill } from "./types";

// Skills grouped by area, strongest first, with a five-dot level. The level is also in text for screen readers.
interface Props {
  skills: Skill[];
  /** Show the level dots. Default true. */
  levels?: boolean;
  labels?: PersonalWidgetLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { levels: true });
const { t, locale } = usePersonalStrings(() => props.labels);
const groups = computed(() => groupSkills(props.skills));
</script>

<template>
  <div data-slot="skills-widget" :class="cn('flex flex-col gap-5', props.class)">
    <div v-for="g in groups" :key="g.group" class="flex flex-col gap-2">
      <p v-if="g.group" class="eyebrow">{{ g.group }}</p>
      <ul class="flex flex-wrap gap-2">
        <li v-for="s in g.skills" :key="s.name" class="inline-flex h-control-sm items-center gap-2 rounded-control border border-border bg-card px-2.5 text-body-sm text-foreground">
          <bdi>{{ s.name }}</bdi>
          <span v-if="props.levels && s.level" role="img" :aria-label="fill(t.level, { n: formatNumber(s.level, locale) })" class="flex gap-0.5">
            <span v-for="i in 5" :key="i" :class="cn('size-1.5 rounded-full', i <= (s.level as number) ? 'bg-primary' : 'bg-nq-line')" />
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>
