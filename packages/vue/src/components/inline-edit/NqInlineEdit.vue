<script lang="ts">
export interface InlineEditLabels {
  edit: string;
  save: string;
  cancel: string;
  empty: string;
  required: string;
  number: string;
  email: string;
  url: string;
  length: string;
  failed: string;
  hintMulti: string;
}
</script>

<script setup lang="ts">
import { Check, Pencil, X } from "lucide-vue-next";
import { computed, nextTick, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqInput, NqTextarea } from "../field";
import { inlineKeyAction, resolveInlineCommit, type InlineEditType } from "./inline-edit-logic";

// Edit in place: text that turns into an input on click (or Enter), with Save and Cancel. Enter saves, Escape cancels,
// leaving the field saves (configurable). The save can be async and can reject with a message.
// `onSave` returns `{ error }` (or throws) to keep editing with the message under the field.
export interface Props {
  /** The saved value. */
  value: string;
  /** Save the new value. Return `{ error }` (or throw) to keep editing. The field and buttons are busy while pending. */
  onSave: (value: string) => void | { error?: string } | undefined | Promise<void | { error?: string } | undefined>;
  /** Names the field for assistive tech ("Edit title") and fills the empty text ("Add title"). */
  label: string;
  type?: InlineEditType;
  /** A textarea instead of a single line. Enter adds a line, Ctrl/Cmd+Enter saves. */
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  /** Return a message to reject the value. Runs after the built-in checks. */
  validate?: (value: string) => string | undefined;
  /** What happens when focus leaves the open editor. Default `save`. */
  onBlurAction?: "save" | "cancel" | "none";
  /** Classes of the display text, so it matches the heading it replaces (`text-h2`). */
  displayClass?: HTMLAttributes["class"];
  /** Classes of the input. */
  inputClass?: HTMLAttributes["class"];
  /** Force left-to-right entry. Default true for `number`, `email` and `url`. */
  ltr?: boolean;
  disabled?: boolean;
  /** Show the value with no edit affordance. */
  readOnly?: boolean;
  labels?: Partial<InlineEditLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  type: "text",
  multiline: false,
  rows: 3,
  placeholder: undefined,
  required: undefined,
  maxLength: undefined,
  validate: undefined,
  onBlurAction: "save",
  displayClass: undefined,
  inputClass: undefined,
  ltr: undefined,
  disabled: undefined,
  readOnly: undefined,
  labels: undefined,
});
/** Controlled editing state: `v-model:editing`. */
const editingModel = defineModel<boolean | undefined>("editing", { default: undefined });
defineSlots<{ value?: (p: { value: string }) => unknown }>();

const { locale } = useNasaq();
const STRINGS = {
  en: {
    edit: "Edit {label}",
    save: "Save",
    cancel: "Cancel",
    empty: "Add {label}",
    required: "This cannot be empty.",
    number: "Enter a number.",
    email: "Enter a valid email address.",
    url: "Enter a link starting with http:// or https://.",
    length: "Too long: at most {max} characters.",
    failed: "Could not save. Try again.",
    hintMulti: "Ctrl+Enter to save, Esc to cancel",
  },
  ar: {
    edit: "تعديل {label}",
    save: "حفظ",
    cancel: "إلغاء",
    empty: "أضف {label}",
    required: "لا يمكن ترك هذا الحقل فارغًا.",
    number: "أدخل رقمًا.",
    email: "أدخل بريدًا إلكترونيًا صحيحًا.",
    url: "أدخل رابطًا يبدأ بـ http:// أو https://.",
    length: "النص طويل: {max} حرفًا كحد أقصى.",
    failed: "تعذر الحفظ. حاول مرة أخرى.",
    hintMulti: "Ctrl+Enter للحفظ وEsc للإلغاء",
  },
};
const t = computed(() => ({ ...STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

const inner = ref(false);
const editing = computed(() => editingModel.value ?? inner.value);
const draft = ref(props.value);
const error = ref<string>();
const pending = ref(false);
const root = ref<HTMLElement>();
const display = ref<HTMLButtonElement>();
const errorId = useId();
let busy = false;
let restoreFocus = false;
const forceLtr = computed(() => props.ltr ?? (props.type === "number" || props.type === "email" || props.type === "url"));

const setEditing = (next: boolean) => {
  inner.value = next;
  editingModel.value = next;
};

// Restart from the saved value every time the editor opens, then focus the field.
watch(editing, async (open) => {
  if (open) {
    draft.value = props.value;
    error.value = undefined;
    await nextTick();
    const el = root.value?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
    el?.focus();
    if (!props.multiline) el?.select();
  } else if (restoreFocus) {
    restoreFocus = false;
    await nextTick();
    display.value?.focus();
  }
});

const close = (focusBack: boolean) => {
  restoreFocus = focusBack;
  error.value = undefined;
  setEditing(false);
};

async function commit(focusBack: boolean) {
  if (busy) return;
  const result = resolveInlineCommit({ draft: draft.value, initial: props.value, type: props.type, required: props.required, maxLength: props.maxLength, validate: props.validate });
  if (result.kind === "unchanged") return close(focusBack);
  if (result.kind === "invalid") {
    error.value =
      result.reason === "custom"
        ? result.message
        : result.reason === "length"
          ? fill(t.value.length, { max: props.maxLength ?? 0 })
          : t.value[result.reason === "required" ? "required" : props.type === "number" ? "number" : props.type === "email" ? "email" : "url"];
    return;
  }
  busy = true;
  pending.value = true;
  try {
    const outcome = await props.onSave(result.value);
    if (outcome && typeof outcome === "object" && outcome.error) {
      error.value = outcome.error;
      return;
    }
    close(focusBack);
  } catch {
    error.value = t.value.failed;
  } finally {
    busy = false;
    pending.value = false;
  }
}

function onKeydown(e: KeyboardEvent) {
  const action = inlineKeyAction({ key: e.key, shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey, isComposing: e.isComposing }, props.multiline);
  if (!action) return;
  e.preventDefault();
  e.stopPropagation();
  if (action === "save") void commit(true);
  else close(true);
}

function onFocusout(e: FocusEvent) {
  if (root.value?.contains(e.relatedTarget as Node | null) || busy || props.onBlurAction === "none") return;
  if (props.onBlurAction === "cancel") close(false);
  else void commit(false);
}

const invalid = computed(() => Boolean(error.value));
const isEmpty = computed(() => props.value === "");
const noEdit = computed(() => props.readOnly || props.disabled);
const onInput = () => {
  if (error.value) error.value = undefined;
};
</script>

<template>
  <div v-if="!editing" data-slot="inline-edit" data-state="display" :class="cn('min-w-0', props.class)">
    <button
      ref="display"
      type="button"
      :disabled="noEdit"
      :aria-label="props.readOnly ? undefined : fill(t.edit, { label: props.label })"
      :class="
        cn(
          'group/inline -mx-1.5 inline-flex max-w-full min-w-0 cursor-text items-center gap-2 rounded-control px-1.5 py-0.5 text-start outline-none transition-colors duration-150 ease-nq',
          'hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus disabled:cursor-default disabled:hover:bg-transparent',
          props.readOnly && 'cursor-default hover:bg-transparent',
        )
      "
      @click="setEditing(true)"
    >
      <span dir="auto" :class="cn('min-w-0 break-words', props.multiline && 'whitespace-pre-wrap', isEmpty && 'text-muted-foreground', props.displayClass)">
        <template v-if="isEmpty">{{ props.placeholder ?? fill(t.empty, { label: props.label }) }}</template>
        <slot v-else name="value" :value="props.value">{{ props.value }}</slot>
      </span>
      <Pencil
        v-if="!noEdit"
        aria-hidden="true"
        class="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/inline:opacity-100 group-focus-visible/inline:opacity-100 pointer-coarse:opacity-100"
      />
    </button>
  </div>
  <div
    v-else
    ref="root"
    role="group"
    :aria-label="fill(t.edit, { label: props.label })"
    data-slot="inline-edit"
    data-state="editing"
    :data-pending="pending || undefined"
    :class="cn('flex min-w-0 flex-col gap-1.5', props.class)"
    @focusout="onFocusout"
  >
    <div :class="cn('flex gap-1.5', props.multiline ? 'items-start' : 'items-center')">
      <NqTextarea
        v-if="props.multiline"
        v-model="draft"
        :rows="props.rows"
        :readonly="pending"
        dir="auto"
        :placeholder="props.placeholder"
        :aria-label="fill(t.edit, { label: props.label })"
        :aria-invalid="invalid || undefined"
        :aria-describedby="invalid ? errorId : undefined"
        :class="cn('min-h-0', props.inputClass)"
        @keydown="onKeydown"
        @input="onInput"
      />
      <NqInput
        v-else
        v-model="draft"
        :type="props.type === 'number' ? 'text' : props.type"
        :inputmode="props.type === 'number' ? 'decimal' : undefined"
        :ltr="forceLtr"
        :dir="forceLtr ? 'ltr' : 'auto'"
        :readonly="pending"
        :placeholder="props.placeholder"
        :aria-label="fill(t.edit, { label: props.label })"
        :aria-invalid="invalid || undefined"
        :aria-describedby="invalid ? errorId : undefined"
        :class="cn('h-control-sm', props.inputClass)"
        @keydown="onKeydown"
        @input="onInput"
      />
      <div :class="cn('flex shrink-0 gap-1', props.multiline && 'flex-col')">
        <NqButton type="button" variant="primary" size="icon-sm" :aria-label="t.save" :loading="pending" @mousedown.prevent @click="commit(true)">
          <Check aria-hidden="true" />
        </NqButton>
        <NqButton type="button" variant="secondary" size="icon-sm" :aria-label="t.cancel" :disabled="pending" @mousedown.prevent @click="close(true)">
          <X aria-hidden="true" />
        </NqButton>
      </div>
    </div>
    <p v-if="invalid" :id="errorId" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>
    <p v-else-if="props.multiline" class="text-caption text-muted-foreground">{{ t.hintMulti }}</p>
  </div>
</template>
