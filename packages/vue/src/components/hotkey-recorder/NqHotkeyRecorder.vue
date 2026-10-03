<script setup lang="ts">
import { Keyboard, RotateCcw, TriangleAlert, X } from "lucide-vue-next";
import { computed, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqShortcutKeys, useShortcutApple, type ShortcutPlatform } from "../keyboard-shortcuts";
import {
  hotkeyConflicts,
  hotkeyFormat,
  hotkeyLabel,
  hotkeyRecordKey,
  hotkeyReservedBy,
  hotkeyValidate,
  type HotkeyConflict,
  type HotkeyIssueCode,
  type HotkeyStep,
} from "./hotkey-logic";
import { fill, STRINGS, type HotkeyRecorderBinding, type HotkeyRecorderLabels } from "./strings";

// Records a keyboard shortcut. Click it (or focus it and press Enter), then press the keys. It reads the physical key,
// so it works on an Arabic layout, refuses shortcuts the browser keeps, and warns when another action already uses the
// keys. Escape cancels, Backspace clears.
interface Props {
  /** The shortcut as a string ("Mod+Shift+K", "G I"), or null when none is set. Use `v-model`. */
  modelValue?: string | null;
  defaultValue?: string | null;
  /** Allow "G I" sequences: keys keep adding until Enter. Default false: one key combination. */
  sequence?: boolean;
  /** Refuse a bare key such as "K": it would fire while people type. Default false. */
  requireModifier?: boolean;
  /** Everything else that is bound, to warn about clashes. */
  bindings?: readonly HotkeyRecorderBinding[];
  /** The id of this shortcut inside `bindings`, so it does not clash with itself. */
  bindingId?: string;
  /** Let people record shortcuts the browser or OS keeps (Ctrl+W). Default false. */
  allowReserved?: boolean;
  /** Shows a reset button when the value differs. */
  resetTo?: string | null;
  platform?: ShortcutPlatform;
  disabled?: boolean;
  /** Accessible name of the recorder: what the shortcut does. */
  label?: string;
  id?: string;
  locale?: string;
  labels?: HotkeyRecorderLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: null,
  sequence: false,
  requireModifier: false,
  bindings: undefined,
  bindingId: undefined,
  allowReserved: false,
  resetTo: undefined,
  platform: "auto",
  disabled: undefined,
  label: undefined,
  id: undefined,
  locale: undefined,
  labels: undefined,
});
const emit = defineEmits<{
  /** The new shortcut, or null when it is cleared. */
  "update:modelValue": [value: string | null];
}>();

const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const t = computed(() => ({ ...STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const uid = useId();
const apple = useShortcutApple(() => props.platform);
const inner = ref<string | null>(props.defaultValue);
const value = computed(() => (props.modelValue === undefined ? inner.value : props.modelValue));
const recording = ref(false);
const steps = ref<HotkeyStep[]>([]);
const error = ref<string | null>(null);
const announce = ref("");

const commit = (next: string | null) => {
  if (props.modelValue === undefined) inner.value = next;
  emit("update:modelValue", next);
  announce.value = next ? fill(t.value.saved, { shortcut: hotkeyLabel(next, apple.value, t.value.then) }) : t.value.cleared;
};

const stop = () => {
  recording.value = false;
  steps.value = [];
};

const begin = () => {
  if (props.disabled) return;
  error.value = null;
  recording.value = true;
  announce.value = t.value.recording;
};

const messageFor = (code: HotkeyIssueCode): string =>
  code === "modifier-required"
    ? t.value.modifierRequired
    : code === "sequence-not-allowed"
      ? t.value.sequenceNotAllowed
      : code === "too-long"
        ? t.value.tooLong
        : code === "empty"
          ? t.value.empty
          : t.value.invalid;

function onKeyDown(event: KeyboardEvent) {
  if (props.disabled) return;
  if (!recording.value) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      begin();
    }
    return;
  }
  // While recording, the page must not see the keys: Ctrl+S would save the page, Tab would leave the control.
  event.preventDefault();
  event.stopPropagation();
  const result = hotkeyRecordKey(steps.value, event, { apple: apple.value, sequence: props.sequence });
  if (result.status === "ignored") return;
  if (result.status === "cancelled") {
    stop();
    return;
  }
  if (result.status === "cleared") {
    stop();
    error.value = null;
    commit(null);
    return;
  }
  if (result.status === "recording") {
    steps.value = result.steps;
    return;
  }
  const next = hotkeyFormat(result.steps);
  const issue = hotkeyValidate(next, { requireModifier: props.requireModifier, sequence: props.sequence });
  const owner = props.allowReserved ? null : hotkeyReservedBy(next, apple.value);
  stop();
  if (issue) {
    error.value = messageFor(issue);
    return;
  }
  if (owner) {
    error.value = owner === "browser" ? t.value.browser : t.value.system;
    return;
  }
  error.value = null;
  commit(next);
}

// A half-typed recording is dropped when the control is disabled.
watch(
  () => props.disabled,
  (d) => {
    if (d && recording.value) stop();
  },
);

const conflicts = computed<HotkeyConflict[]>(() =>
  value.value && props.bindings ? hotkeyConflicts(value.value, props.bindings, { apple: apple.value, ignoreId: props.bindingId }) : [],
);
const nameOf = (c: HotkeyConflict) => props.bindings?.find((b) => b.id === c.id)?.label ?? c.id;
const conflictText = (c: HotkeyConflict) =>
  fill(c.kind === "duplicate" ? t.value.duplicate : c.kind === "shadows" ? t.value.shadows : t.value.shadowed, { label: nameOf(c) });
const errorId = computed(() => `${uid}-error`);
const canReset = computed(() => props.resetTo !== undefined && props.resetTo !== value.value);
const ariaLabel = computed(() =>
  props.label ? `${props.label}: ${value.value ? hotkeyLabel(value.value, apple.value, t.value.then) : t.value.notSet}` : value.value ? t.value.change : t.value.record,
);

function clearValue() {
  error.value = null;
  commit(null);
}
function resetValue() {
  error.value = null;
  commit(props.resetTo ?? null);
}
</script>

<template>
  <div data-slot="hotkey-recorder" :data-recording="recording || undefined" :class="cn('flex min-w-0 flex-col gap-1.5', props.class)">
    <div class="flex items-center gap-1.5">
      <button
        :id="props.id"
        type="button"
        :disabled="props.disabled"
        :aria-label="ariaLabel"
        :aria-describedby="error || conflicts.length ? errorId : undefined"
        :aria-invalid="error ? true : undefined"
        :data-invalid="error ? '' : undefined"
        :class="
          cn(
            'flex min-h-control min-w-0 flex-1 items-center gap-2 rounded-control border border-input bg-card px-3 text-start text-body text-foreground outline-none',
            'transition-colors duration-150 ease-nq focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus',
            'disabled:cursor-not-allowed disabled:opacity-50',
            recording && 'border-nq-focus outline-1 outline-nq-focus',
            error && 'border-nq-danger',
          )
        "
        @click="begin"
        @keydown="onKeyDown"
        @blur="stop"
      >
        <Keyboard aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
        <span v-if="recording" class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <NqShortcutKeys v-if="steps.length > 0" :shortcut="hotkeyFormat(steps)" :platform="props.platform" :then-label="t.then" />
          <span class="text-body-sm text-muted-foreground">{{ props.sequence ? t.pressSequence : t.press }}</span>
        </span>
        <NqShortcutKeys v-else-if="value" :shortcut="value" :platform="props.platform" :then-label="t.then" />
        <span v-else class="text-muted-foreground">{{ t.notSet }}</span>
        <span v-if="recording" class="ms-auto shrink-0 text-caption text-muted-foreground">{{ t.escHint }}</span>
      </button>
      <NqButton v-if="value && !props.disabled" type="button" variant="ghost" size="icon" :aria-label="t.clear" @click="clearValue">
        <X aria-hidden="true" />
      </NqButton>
      <NqButton
        v-if="canReset && !props.disabled"
        type="button"
        variant="ghost"
        size="icon"
        :aria-label="t.reset"
        :title="props.resetTo ? `${t.defaultIs}: ${hotkeyLabel(props.resetTo, apple, t.then)}` : t.reset"
        @click="resetValue"
      >
        <RotateCcw aria-hidden="true" />
      </NqButton>
    </div>
    <ul v-if="error || conflicts.length" :id="errorId" role="list" class="flex flex-col gap-0.5">
      <li v-if="error" role="alert" class="flex items-start gap-1.5 text-caption text-nq-danger-text">
        <TriangleAlert aria-hidden="true" class="mt-0.5 size-3.5 shrink-0" />
        {{ error }}
      </li>
      <li v-for="c in conflicts" :key="c.id" :data-conflict="c.kind" class="flex items-start gap-1.5 text-caption text-nq-warning-text">
        <TriangleAlert aria-hidden="true" class="mt-0.5 size-3.5 shrink-0" />
        {{ conflictText(c) }}
      </li>
    </ul>
    <span role="status" aria-live="polite" class="sr-only">{{ announce }}</span>
  </div>
</template>
