<script setup lang="ts">
import { Award } from "lucide-vue-next";
import { computed, getCurrentInstance, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqEmptyState from "../states/NqEmptyState.vue";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsTab } from "../tabs";
import NqAchievementMedal from "./NqAchievementMedal.vue";
import { achievementCounts, achievementStatus, filterAchievements, type AchievementFilter } from "./gamification-logic";
import { RARITY_STYLE, type GamificationLabels } from "./strings";
import type { Achievement } from "./types";
import { useKit } from "./use-kit";

// Every badge and achievement as a grid, with earned, in-progress and locked states and a filter.
interface Props {
  achievements: readonly Achievement[];
  /** Filter tabs (All, Earned, In progress, Locked). Default true. */
  filters?: boolean;
  /** Controlled filter. Without it the grid keeps its own. */
  filter?: AchievementFilter;
  /** Makes each badge a button that fires `select` with its id. Also on when a `@select` listener is set. */
  selectable?: boolean;
  selectedId?: string;
  labels?: Partial<GamificationLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { filters: true, filter: undefined, selectable: false, selectedId: undefined, labels: undefined });
const emit = defineEmits<{ filterChange: [filter: AchievementFilter]; select: [id: string] }>();
const instance = getCurrentInstance();
const isButton = computed(() => props.selectable || typeof instance?.vnode.props?.onSelect !== "undefined");
const { t, num } = useKit(() => props.labels);
const local = ref<AchievementFilter>("all");
const filter = computed(() => props.filter ?? local.value);
const counts = computed(() => achievementCounts(props.achievements));
const shown = computed(() => filterAchievements(props.achievements, filter.value));
const tabs = computed<[AchievementFilter, string][]>(() => [
  ["all", t.value.all],
  ["earned", t.value.earned],
  ["in-progress", t.value.inProgress],
  ["locked", t.value.locked],
]);
const set = (v: string | number) => {
  local.value = v as AchievementFilter;
  emit("filterChange", v as AchievementFilter);
};
const info = (a: Achievement) => {
  const status = achievementStatus(a);
  return { status, hidden: !!a.secret && status !== "earned" };
};
const statusText = (a: Achievement) => {
  const status = achievementStatus(a);
  if (status === "earned") return t.value.earned;
  if (status === "locked") return t.value.locked;
  return `${t.value.inProgress} · ${t.value.progressOf(num(a.progress ?? 0), num(a.goal ?? 1))}`;
};
</script>

<template>
  <section data-slot="badge-grid" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <NqTabs v-if="props.filters" :model-value="filter" @update:model-value="set">
      <NqTabsList :aria-label="t.badgesFilter">
        <NqTabsTab v-for="[id, label] in tabs" :key="id" :value="id">
          {{ label }}
          <span class="text-caption tabular-nums text-muted-foreground">{{ num(counts[id]) }}</span>
        </NqTabsTab>
        <NqTabsIndicator />
      </NqTabsList>
    </NqTabs>
    <NqEmptyState v-if="shown.length === 0" :icon="Award" :title="t.noMatches" :description="t.noMatchesHint" />
    <ul v-else class="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3">
      <li v-for="a in shown" :key="a.id" class="min-w-0">
        <component
          :is="isButton ? 'button' : 'div'"
          :type="isButton ? 'button' : undefined"
          :aria-pressed="isButton ? props.selectedId === a.id : undefined"
          :data-status="info(a).status"
          :data-selected="props.selectedId === a.id ? '' : undefined"
          :class="
            cn(
              'flex h-full w-full flex-col items-center gap-2 rounded-card border border-border bg-card p-3 text-center outline-none transition-colors duration-150 ease-nq',
              isButton && 'hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
              'data-selected:border-nq-line-strong data-selected:bg-nq-selected',
              info(a).status === 'locked' && 'text-muted-foreground',
            )
          "
          @click="isButton && emit('select', a.id)"
        >
          <NqAchievementMedal :achievement="info(a).hidden ? { ...a, icon: undefined } : a" />
          <span dir="auto" :class="cn('line-clamp-2 text-label', info(a).status === 'locked' ? 'text-muted-foreground' : 'text-foreground')">
            {{ info(a).hidden ? t.secret : a.title }}
          </span>
          <span class="flex flex-col items-center gap-0.5 text-caption text-muted-foreground">
            <span>{{ statusText(a) }}</span>
            <span v-if="a.rarity && a.rarity !== 'common' && !info(a).hidden" :class="RARITY_STYLE[a.rarity].text">{{ t.rarity[a.rarity] }}</span>
          </span>
        </component>
      </li>
    </ul>
  </section>
</template>
