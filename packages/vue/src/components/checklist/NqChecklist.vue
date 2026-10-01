<script setup lang="ts">
import { ListChecks } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqProgress } from "../progress";
import { NqEmptyState } from "../states";
import { checklistProgress, type ChecklistItem } from "./checklist-logic";
import { strings, type Labels } from "./checklist-strings";
import NqChecklistAddRow from "./NqChecklistAddRow.vue";
import NqChecklistRow, { type RowContext } from "./NqChecklistRow.vue";

// A list of tickable items with a progress bar, one level of subtasks and file attachments. Progress counts
// leaf tasks, and a parent is done when all of its subtasks are. Everything is a callback: you own the
// data and pass the updated `items` back (`toggleItem` does the cascade for you).
type Result = void | { error?: string };
interface Props {
  items: ChecklistItem[];
  /** An item or subtask was ticked or unticked. Ticking a parent should apply to its subtasks: see `toggleItem`. */
  onToggle: (id: string, done: boolean) => Promise<Result>;
  /** Add an item, or a subtask when `parentId` is set. Omit to hide the add row. */
  onAdd?: (text: string, parentId?: string) => Promise<Result>;
  /** Delete an item or subtask. Omit to hide the delete buttons. */
  onRemove?: (id: string) => Promise<Result>;
  /** Files chosen for an item. Omit to hide the attach button. */
  onAttach?: (id: string, files: File[]) => Promise<Result>;
  onRemoveAttachment?: (itemId: string, attachmentId: string) => Promise<Result>;
  /** Show the progress bar. Default true. */
  showProgress?: boolean;
  /** Read-only: no ticking, adding or deleting. */
  readOnly?: boolean;
  labels?: Labels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { showProgress: true, readOnly: false });

const nq = useNasaq();
const t = computed(() => ({ ...strings(nq.locale.value), ...props.labels }) as ReturnType<typeof strings>);
const error = ref<string | null>(null);
const p = computed(() => checklistProgress(props.items));

async function run(fn: () => Promise<Result> | undefined): Promise<boolean> {
  error.value = null;
  try {
    const r = await fn();
    if (r && typeof r === "object" && r.error) {
      error.value = r.error;
      return false;
    }
    return true;
  } catch {
    error.value = t.value.failed;
    return false;
  }
}

const ctx = computed<RowContext>(() => ({
  t: t.value,
  readOnly: props.readOnly,
  run,
  onToggle: props.onToggle,
  onAdd: props.onAdd,
  onRemove: props.onRemove,
  onAttach: props.onAttach,
  onRemoveAttachment: props.onRemoveAttachment,
}));
</script>

<template>
  <section data-slot="checklist" :aria-label="t.title" :class="cn('flex flex-col gap-3', props.class)">
    <NqProgress
      v-if="props.showProgress && p.total > 0"
      :value="p.percent"
      :tone="p.percent === 100 ? 'success' : 'default'"
      :label="p.percent === 100 ? t.complete : t.progress(p.done, p.total)"
    />
    <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
    <NqEmptyState v-if="props.items.length === 0" :icon="ListChecks" :title="t.empty" :description="props.readOnly ? undefined : t.emptyBody" />
    <ul v-else :aria-label="t.list" class="flex flex-col gap-1">
      <NqChecklistRow v-for="item in props.items" :key="item.id" :item="item" :ctx="ctx" />
    </ul>
    <NqChecklistAddRow v-if="!props.readOnly && props.onAdd" :label="t.addLabel" :placeholder="t.addPlaceholder" :t="t" :on-submit="(text: string) => run(() => props.onAdd?.(text))" />
  </section>
</template>
