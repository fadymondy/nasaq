<script setup lang="ts">
import { CalendarDays, LayoutGrid, List, SquareKanban, Table2 } from "lucide-vue-next";
import { computed, onMounted, ref, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { NqTooltip } from "../tooltip";
import type { ViewMode, ViewToggleLabels } from "./types";


const STRINGS = {
  en: { label: "View", table: "Table", grid: "Grid", board: "Board", list: "List", calendar: "Calendar" },
  ar: { label: "طريقة العرض", table: "جدول", grid: "شبكة", board: "لوحة", list: "قائمة", calendar: "تقويم" },
};

interface Props {
  /** The views this page offers, in order. Default table and grid. */
  views?: readonly ViewMode[];
  /** Controlled view (`v-model`). */
  modelValue?: ViewMode;
  /** First view when uncontrolled. Default the first of `views`. */
  defaultValue?: ViewMode;
  /** Remembers the choice in `localStorage` under this key, so the page opens in the view the visitor left it in. */
  storageKey?: string;
  /** Show the text next to each icon. Default false: icon-only with a tooltip. */
  showLabels?: boolean;
  labels?: Partial<ViewToggleLabels>;
  class?: HTMLAttributes["class"];
}

/**
 * Switches how a collection is shown: table, grid of cards, board, list or calendar. One view is always
 * pressed. With `storageKey` the choice survives reloads.
 */
const props = withDefaults(defineProps<Props>(), { views: () => ["table", "grid"], modelValue: undefined, defaultValue: undefined, storageKey: undefined, showLabels: false, labels: undefined });
const emit = defineEmits<{ "update:modelValue": [view: ViewMode] }>();
defineOptions({ inheritAttrs: false });

const ICONS: Record<ViewMode, Component> = { table: Table2, grid: LayoutGrid, board: SquareKanban, list: List, calendar: CalendarDays };

const nasaq = useNasaq();
const t = computed(() => ({ ...STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const inner = ref<ViewMode>(props.defaultValue ?? props.views[0] ?? "table");
const current = computed(() => props.modelValue ?? inner.value);
// Bumped when the group tries to clear the pressed view, so the group is handed `[current]` again.
const nonce = ref(0);
const groupValue = computed(() => {
  void nonce.value;
  return [current.value];
});

function select(next: ViewMode) {
  inner.value = next;
  if (props.storageKey) {
    try {
      window.localStorage.setItem(props.storageKey, next);
    } catch {
      /* storage full or blocked: the choice still applies for this visit */
    }
  }
  emit("update:modelValue", next);
}

function onUpdate(next: string[]) {
  const picked = next[0] as ViewMode | undefined;
  if (picked && picked !== current.value) select(picked);
  else nonce.value++;
}

// Read the stored view after mount, so server and client render the same first frame.
onMounted(() => {
  if (!props.storageKey) return;
  try {
    const stored = window.localStorage.getItem(props.storageKey) as ViewMode | null;
    if (stored && props.views.includes(stored) && stored !== current.value) {
      inner.value = stored;
      emit("update:modelValue", stored);
    }
  } catch {
    /* storage blocked */
  }
});
</script>

<template>
  <div data-slot="view-toggle" :class="cn('inline-flex', props.class)" v-bind="$attrs">
    <NqToggleGroup :aria-label="t.label" :model-value="groupValue" @update:model-value="onUpdate">
      <template v-for="view in views" :key="view">
        <NqToggle v-if="showLabels" :value="view" :data-view="view">
          <component :is="ICONS[view]" aria-hidden="true" />
          <span>{{ t[view] }}</span>
        </NqToggle>
        <NqTooltip v-else :content="t[view]">
          <NqToggle :value="view" :aria-label="t[view]" :data-view="view">
            <component :is="ICONS[view]" aria-hidden="true" />
          </NqToggle>
        </NqTooltip>
      </template>
    </NqToggleGroup>
  </div>
</template>
