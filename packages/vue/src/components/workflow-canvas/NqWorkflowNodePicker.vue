<script setup lang="ts">
import { Search } from "lucide-vue-next";
import { computed, onMounted, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqInput } from "../field";
import NqWorkflowPanelHeader from "./NqWorkflowPanelHeader.vue";
import { useCanvasLabels, type WorkflowCanvasLabels } from "./labels";
import { pickerGroups, type WorkflowStepType } from "./workflow-model";

// "What happens next?": every step grouped by category and searchable by name, description or keyword.
// Arrow keys move through the matches and Enter adds the highlighted one.
interface Props {
  /** The steps to offer. The canvas passes triggers when the graph has none, actions otherwise. */
  types: WorkflowStepType[];
  /** Group headings: `{ id, label }` in display order. A category with no entry shows its id. */
  categories?: { id: string; label: string }[];
  /** The name of the node the step will follow. Omit when starting a workflow. */
  afterName?: string;
  labels?: Partial<WorkflowCanvasLabels>;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const emit = defineEmits<{ pick: [type: WorkflowStepType]; close: [] }>();

const { t } = useCanvasLabels(() => props.labels);
const uid = useId();
const q = ref("");
const active = ref(0);
const input = ref<InstanceType<typeof NqInput> | null>(null);
onMounted(() => (input.value?.$el as HTMLInputElement | undefined)?.focus());

const groups = computed(() => pickerGroups(props.types, props.categories, q.value));
const flat = computed(() => groups.value.flatMap((g) => g.steps));
const current = computed(() => flat.value[Math.min(active.value, flat.value.length - 1)]);

function onKey(e: KeyboardEvent) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    active.value = Math.min(active.value + 1, flat.value.length - 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    active.value = Math.max(active.value - 1, 0);
  } else if (e.key === "Enter" && current.value) {
    e.preventDefault();
    emit("pick", current.value);
  }
}
</script>

<template>
  <div data-slot="workflow-node-picker" :class="cn('flex h-full min-h-0 flex-col', props.class)" @keydown="(e) => e.key === 'Escape' && emit('close')">
    <NqWorkflowPanelHeader :title="t.pickerTitle" :hint="props.afterName ? t.pickerAfter(props.afterName) : t.pickerStart" :close-label="t.close" @close="emit('close')" />
    <div class="relative border-b border-border px-4 py-3">
      <Search aria-hidden="true" class="pointer-events-none absolute start-7 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <NqInput
        ref="input"
        v-model="q"
        class="ps-9"
        :placeholder="t.pickerSearch"
        :aria-label="t.pickerSearch"
        role="combobox"
        aria-expanded="true"
        :aria-controls="`nq-picker-list-${uid}`"
        :aria-activedescendant="current ? `nq-pick-${uid}-${current.id}` : undefined"
        @update:model-value="active = 0"
        @keydown="onKey"
      />
    </div>
    <div :id="`nq-picker-list-${uid}`" role="listbox" :aria-label="t.pickerTitle" class="min-h-0 flex-1 overflow-y-auto py-2">
      <p v-if="groups.length === 0" class="px-4 py-6 text-center text-body-sm text-muted-foreground">{{ t.pickerNone(q) }}</p>
      <div v-for="g in groups" :key="g.id" role="group" :aria-label="g.label" class="pb-2">
        <p class="eyebrow px-4 pb-1 pt-2">{{ g.label }}</p>
        <button
          v-for="s in g.steps"
          :id="`nq-pick-${uid}-${s.id}`"
          :key="s.id"
          type="button"
          role="option"
          :aria-selected="s.id === current?.id"
          tabindex="-1"
          :data-pick-type="s.id"
          :class="cn('flex w-full items-start gap-3 px-4 py-2.5 text-start transition-colors', s.id === current?.id ? 'bg-nq-hover' : 'hover:bg-nq-hover')"
          @mouseenter="active = flat.indexOf(s)"
          @click="emit('pick', s)"
        >
          <span class="flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary [&_svg]:size-4">
            <component :is="s.icon" aria-hidden="true" />
          </span>
          <span class="min-w-0">
            <span class="block text-label text-foreground">{{ s.label }}</span>
            <span v-if="s.description" class="block text-caption text-muted-foreground">{{ s.description }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
