<script setup lang="ts">
import { onMounted, ref } from "vue";
import { cn } from "../../lib/cn";
import type { CellEditMove } from "./use-data-table";

// The inline input for text, number, date and link cells. Enter and Tab commit, Escape cancels, leaving commits.
// Internal to the data table.
interface Props {
  type: string;
  initial: string;
  /** Return false to keep editing (a validation error): the input stays open and focused. */
  onCommit: (raw: string, move: CellEditMove) => boolean | void;
  ariaLabel: string;
  /** The edit began by typing a character: keep the caret after it instead of selecting it. */
  seeded?: boolean;
  invalid?: boolean;
  describedBy?: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{ cancel: [] }>();
const draft = ref(props.initial);
const done = ref(false);
const input = ref<HTMLInputElement | null>(null);
const numeric = props.type === "number";

function finish(move: CellEditMove) {
  if (done.value) return;
  done.value = true;
  if (props.onCommit(draft.value, move) === false) done.value = false;
}
function onKeydown(e: KeyboardEvent) {
  e.stopPropagation();
  if (e.key === "Enter") {
    e.preventDefault();
    finish("down");
  } else if (e.key === "Tab") {
    e.preventDefault();
    finish(e.shiftKey ? "left" : "right");
  } else if (e.key === "Escape") {
    e.preventDefault();
    done.value = true;
    emit("cancel");
  }
}
function onFocus(e: FocusEvent) {
  if (props.type === "date") return;
  const el = e.currentTarget as HTMLInputElement;
  if (props.seeded) el.setSelectionRange(props.initial.length, props.initial.length);
  else el.select();
}
onMounted(() => input.value?.focus());
</script>

<template>
  <input
    ref="input"
    v-model="draft"
    :type="props.type === 'date' ? 'date' : 'text'"
    :inputmode="numeric ? 'decimal' : props.type === 'url' ? 'url' : undefined"
    :dir="numeric || props.type === 'url' || props.type === 'date' ? 'ltr' : 'auto'"
    :aria-label="props.ariaLabel"
    :aria-invalid="props.invalid || undefined"
    :aria-describedby="props.describedBy"
    :class="
      cn(
        'absolute inset-0 size-full min-w-0 bg-card px-3 text-body-sm text-foreground outline-2 -outline-offset-2',
        props.invalid ? 'outline-nq-danger-text' : 'outline-nq-focus',
        numeric && 'text-end',
        (props.type === 'url' || props.type === 'date') && 'text-start',
      )
    "
    @keydown="onKeydown"
    @blur="finish('none')"
    @focus="onFocus"
  />
</template>
