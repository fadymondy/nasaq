<script setup lang="ts">
import { computed, nextTick, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";

// One-time-code entry: `length` boxes, paste fills them all, Backspace steps back. The group is forced
// left-to-right so digits keep their order inside RTL pages.
interface Props {
  /** Number of boxes. Default 6. */
  length?: number;
  /** Controlled value (up to `length` characters). Use `v-model`. */
  modelValue?: string;
  defaultValue?: string;
  /** `numeric` (default) accepts digits and opens the numeric keypad; `alphanumeric` accepts letters too. */
  type?: "numeric" | "alphanumeric";
  /** Form field name. A hidden input carries the joined code. */
  name?: string;
  disabled?: boolean;
  /** Mark the boxes invalid. */
  invalid?: boolean;
  autoFocus?: boolean;
  /** Accessible name of each box. Localise. Default "Digit 1 of 6" / "الخانة 1 من 6". */
  getBoxLabel?: (index: number, length: number) => string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  length: 6,
  modelValue: undefined,
  defaultValue: "",
  type: "numeric",
  name: undefined,
  getBoxLabel: undefined,
});
const emit = defineEmits<{
  "update:modelValue": [value: string];
  /** Once every box is filled, with the full code. */
  complete: [value: string];
}>();
const t = useT();

const inner = ref(props.defaultValue);
const current = computed(() => (props.modelValue ?? inner.value).slice(0, props.length));
// Latest code, updated synchronously so focus handlers fired before the re-render see it.
let latest = current.value;
const boxes = ref<HTMLInputElement[]>([]);
const allowed = computed(() => (props.type === "numeric" ? /[0-9]/ : /[a-zA-Z0-9]/));
const clean = (s: string) => [...s].filter((c) => allowed.value.test(c)).join("");
const label = (i: number) => props.getBoxLabel?.(i, props.length) ?? t(`Digit ${i + 1} of ${props.length}`, `الخانة ${i + 1} من ${props.length}`);

function commit(next: string) {
  latest = next;
  inner.value = next;
  emit("update:modelValue", next);
  if (next.length === props.length) emit("complete", next);
}
function focusBox(i: number) {
  const el = boxes.value[Math.max(0, Math.min(props.length - 1, i))];
  el?.focus();
  el?.select();
}
/** Write `text` from box `start`; the code is kept dense (no holes). */
function fill(start: number, text: string) {
  const chars = current.value.split("");
  const room = text.slice(0, props.length - start);
  for (let k = 0; k < room.length; k++) chars[start + k] = room[k] as string;
  commit(chars.join(""));
  nextTick(() => focusBox(Math.min(start + room.length, props.length - 1)));
}
function onInput(i: number, e: Event) {
  const el = e.target as HTMLInputElement;
  const raw = el.value;
  const text = clean(raw);
  if (!text) {
    // The typed character was rejected, or the box was emptied.
    const chars = current.value.split("");
    if (raw === "" && i < chars.length) {
      chars.splice(i, 1);
      commit(chars.join(""));
    } else el.value = current.value[i] ?? "";
    return;
  }
  fill(Math.min(i, current.value.length), text);
}
function onKeydown(i: number, e: KeyboardEvent) {
  const value = current.value;
  if (e.key === "Backspace" && !value[i]) {
    e.preventDefault();
    if (i > 0) {
      commit(value.slice(0, i - 1) + value.slice(i));
      nextTick(() => focusBox(i - 1));
    }
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    focusBox(i - 1);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    focusBox(i + 1);
  } else if (e.key === "Home") {
    e.preventDefault();
    focusBox(0);
  } else if (e.key === "End") {
    e.preventDefault();
    focusBox(props.length - 1);
  }
}
function onPaste(i: number, e: ClipboardEvent) {
  e.preventDefault();
  const text = clean(e.clipboardData?.getData("text") ?? "");
  if (!text) return;
  if (text.length >= props.length) {
    commit(text.slice(0, props.length));
    nextTick(() => focusBox(props.length - 1));
  } else fill(Math.min(i, current.value.length), text);
}
function onFocus(i: number, e: FocusEvent) {
  // Never leave a gap: land on the first empty box.
  if (i > latest.length) focusBox(latest.length);
  else (e.currentTarget as HTMLInputElement).select();
}
onMounted(() => {
  if (props.autoFocus) boxes.value[0]?.focus();
});
</script>

<template>
  <div role="group" dir="ltr" data-slot="otp-input" :class="cn('inline-flex items-center gap-2', props.class)">
    <input
      v-for="(_, i) in props.length"
      :key="i"
      :ref="(el) => { if (el) boxes[i] = el as HTMLInputElement; }"
      data-slot="otp-input-box"
      :data-filled="current[i] ? '' : undefined"
      :aria-label="label(i)"
      :aria-invalid="props.invalid || undefined"
      :data-invalid="props.invalid ? '' : undefined"
      type="text"
      :inputmode="props.type === 'numeric' ? 'numeric' : 'text'"
      autocomplete="one-time-code"
      autocapitalize="off"
      :spellcheck="false"
      :maxlength="i === 0 || !current[i] ? props.length : 1"
      :disabled="props.disabled"
      :value="current[i] ?? ''"
      :class="
        cn(
          'size-control min-h-[var(--nq-touch-min,0px)] min-w-0 rounded-control border border-input bg-card p-0 text-center text-body font-medium tabular-nums text-foreground',
          'transition-colors duration-150 ease-nq outline-none',
          'focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus',
          'data-invalid:border-nq-danger aria-invalid:border-nq-danger',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'pointer-coarse:text-[16px]',
        )
      "
      @input="onInput(i, $event)"
      @keydown="onKeydown(i, $event)"
      @paste="onPaste(i, $event)"
      @focus="onFocus(i, $event)"
    />
    <input v-if="props.name" type="hidden" :name="props.name" :value="current" />
  </div>
</template>
