<script setup lang="ts">
import { onMounted, ref } from "vue";
import { cn } from "../../lib/cn";

// The inline input for text, number, date and link cells. Enter and Tab commit, Escape cancels, leaving commits.
// Internal to the content table editor.
type Move = "down" | "right" | "left" | "none";
interface Props {
  type: string;
  initial: string;
  label: string;
  /** The edit began by typing a character: keep the caret after it instead of selecting it. */
  seeded?: boolean;
}
const props = defineProps<Props>();
const emit = defineEmits<{ commit: [raw: string, move: Move]; cancel: [] }>();
const draft = ref(props.initial);
const done = ref(false);
const input = ref<HTMLInputElement | null>(null);
const numeric = props.type === "number";

function finish(move: Move) {
  if (done.value) return;
  done.value = true;
  emit("commit", draft.value, move);
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
    :aria-label="props.label"
    :class="
      cn(
        'absolute inset-0 size-full min-w-0 bg-card px-3 text-body-sm text-foreground outline-2 -outline-offset-2 outline-nq-focus',
        numeric && 'text-end',
        (props.type === 'url' || props.type === 'date') && 'text-start',
      )
    "
    @keydown="onKeydown"
    @blur="finish('none')"
    @focus="onFocus"
  />
</template>
