<script setup lang="ts">
import { X } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes, type InputHTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { normalizeForSearch } from "../commands";

// Chips inside an input box. Enter or comma adds the typed text, Backspace on an empty input removes the last chip,
// and pasting splits on commas and new lines. Works as a Field control.
interface Props {
  /** Tags. Use `v-model`. Omit to let the component own them. */
  modelValue?: readonly string[];
  defaultValue?: readonly string[];
  /** Most tags allowed. At the limit, new tags are refused with a message. */
  maxTags?: number;
  /**
   * Checks a trimmed tag before it is added. Return `true` to accept, `false` for the generic message,
   * or a string: the (localised) message to show.
   */
  validate?: (tag: string, tags: readonly string[]) => boolean | string;
  /** Words offered while typing, filtered with `normalizeForSearch` (case, Arabic diacritics and letter variants). */
  suggestions?: readonly string[];
  /** Also treat these keys as a separator. Default: Enter, "," and the Arabic comma. */
  separators?: readonly string[];
  /** Add the text still in the input when it loses focus. Default true. */
  addOnBlur?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Renders one hidden `<input name=…>` per tag so a native form submits them. */
  name?: string;
  /** Marks the box invalid. Inside a Field with `invalid` this is automatic. */
  invalid?: boolean;
  /** Extra attributes for the text input, e.g. `id` or `aria-label`. */
  inputProps?: InputHTMLAttributes & Record<string, unknown>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: () => [],
  maxTags: undefined,
  validate: undefined,
  suggestions: undefined,
  separators: () => ["Enter", ",", "،"],
  addOnBlur: true,
  placeholder: undefined,
  name: undefined,
  inputProps: undefined,
});
const emit = defineEmits<{
  "update:modelValue": [tags: string[]];
  /** A tag was refused, with the reason. */
  reject: [tag: string, reason: "duplicate" | "invalid" | "max"];
}>();

const nasaq = useNasaq();
const STRINGS = {
  en: {
    placeholder: "Type and press Enter",
    remove: (tag: string) => `Remove ${tag}`,
    added: (tag: string) => `${tag} added`,
    removed: (tag: string) => `${tag} removed`,
    duplicate: (tag: string) => `${tag} is already added.`,
    invalid: (tag: string) => `${tag} is not valid.`,
    max: (max: number) => `You can add up to ${max} ${max === 1 ? "tag" : "tags"}.`,
    suggestions: "Suggestions",
  },
  ar: {
    placeholder: "اكتب ثم اضغط Enter",
    remove: (tag: string) => `إزالة ${tag}`,
    added: (tag: string) => `تمت إضافة ${tag}`,
    removed: (tag: string) => `تمت إزالة ${tag}`,
    duplicate: (tag: string) => `${tag} مضاف بالفعل.`,
    invalid: (tag: string) => `${tag} غير صالح.`,
    max: (max: number) => `يمكنك إضافة ${max} وسوم كحد أقصى.`,
    suggestions: "اقتراحات",
  },
};
const t = computed(() => STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"]);

const inner = ref<readonly string[]>(props.defaultValue);
const tags = computed(() => props.modelValue ?? inner.value);
// Latest tags, updated synchronously so several edits in one tick see each other.
let latest: readonly string[] = tags.value;
const text = ref("");
const error = ref<string | null>(null);
const message = ref("");
const open = ref(false);
const active = ref(-1);
const inputEl = ref<HTMLInputElement>();
const listId = useId();

function commit(next: string[]) {
  latest = next;
  inner.value = next;
  emit("update:modelValue", next);
}

/** Adds each tag in order; returns true when every one was accepted. */
function addMany(raw: string[]) {
  latest = tags.value;
  let next = [...latest];
  let firstError: string | null = null;
  const added: string[] = [];
  for (const item of raw) {
    const tag = item.trim();
    if (!tag) continue;
    let problem: string | null = null;
    let reason: "duplicate" | "invalid" | "max" | null = null;
    if (props.maxTags !== undefined && next.length >= props.maxTags) {
      problem = t.value.max(props.maxTags);
      reason = "max";
    } else if (next.some((x) => normalizeForSearch(x) === normalizeForSearch(tag))) {
      problem = t.value.duplicate(tag);
      reason = "duplicate";
    } else if (props.validate) {
      const result = props.validate(tag, next);
      if (result !== true) {
        problem = typeof result === "string" ? result : t.value.invalid(tag);
        reason = "invalid";
      }
    }
    if (problem && reason) {
      firstError ??= problem;
      emit("reject", tag, reason);
    } else {
      next = [...next, tag];
      added.push(tag);
    }
  }
  if (added.length) {
    commit(next);
    message.value = added.map(t.value.added).join(", ");
  }
  error.value = firstError;
  return firstError === null;
}

const filtered = computed(() => {
  if (!props.suggestions?.length) return [];
  const q = normalizeForSearch(text.value);
  const chosen = new Set(tags.value.map(normalizeForSearch));
  return props.suggestions.filter((s) => !chosen.has(normalizeForSearch(s)) && (!q || normalizeForSearch(s).includes(q)));
});
const showList = computed(() => open.value && filtered.value.length > 0 && text.value.trim() !== "");

function pick(s: string) {
  if (addMany([s])) text.value = "";
  open.value = false;
  active.value = -1;
  inputEl.value?.focus();
}

function onKeydown(e: KeyboardEvent) {
  if (e.defaultPrevented || e.isComposing) return;
  if (showList.value && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
    e.preventDefault();
    const n = filtered.value.length;
    active.value = e.key === "ArrowDown" ? (active.value + 1) % n : (active.value - 1 + n) % n;
    return;
  }
  if (e.key === "Escape" && showList.value) {
    e.preventDefault();
    open.value = false;
    return;
  }
  if (e.key === "Enter" && showList.value && active.value >= 0 && filtered.value[active.value]) {
    e.preventDefault();
    pick(filtered.value[active.value] as string);
    return;
  }
  if (props.separators.includes(e.key) && text.value.trim()) {
    e.preventDefault();
    if (addMany([text.value])) text.value = "";
    open.value = false;
    active.value = -1;
    return;
  }
  if (props.separators.includes(e.key) && e.key !== "Enter") {
    // A bare comma is never text.
    e.preventDefault();
    return;
  }
  latest = tags.value;
  if (e.key === "Backspace" && text.value === "" && latest.length) {
    const last = latest[latest.length - 1] as string;
    commit(latest.slice(0, -1));
    message.value = t.value.removed(last);
    error.value = null;
  }
}

function onPaste(e: ClipboardEvent) {
  if (e.defaultPrevented) return;
  const pasted = e.clipboardData?.getData("text") ?? "";
  if (!/[,\n\r،]/.test(pasted)) return;
  e.preventDefault();
  addMany(`${text.value}${pasted}`.split(/[,\n\r،]+/));
  text.value = "";
}

function removeAt(index: number) {
  latest = tags.value;
  const tag = latest[index];
  if (tag === undefined) return;
  commit(latest.filter((_, i) => i !== index));
  message.value = t.value.removed(tag);
  error.value = null;
  inputEl.value?.focus();
}

function onInput(e: Event) {
  text.value = (e.target as HTMLInputElement).value;
  open.value = true;
  active.value = -1;
  if (error.value) error.value = null;
}

function onBlur() {
  open.value = false;
  if (props.addOnBlur && text.value.trim() && addMany([text.value])) text.value = "";
}
</script>

<template>
  <div
    data-slot="tag-input"
    :data-disabled="props.disabled ? '' : undefined"
    :data-invalid="props.invalid || error ? '' : undefined"
    :class="cn('relative w-full', props.class)"
  >
    <div
      data-slot="tag-input-box"
      :class="
        cn(
          'flex min-h-control w-full min-w-0 flex-wrap items-center gap-1.5 rounded-control border border-input bg-card px-2 py-1 text-body text-foreground',
          'min-h-[max(var(--nq-control),var(--nq-touch-min,0px))] transition-colors duration-150 ease-nq',
          'focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus',
          'has-[[data-invalid]]:border-nq-danger has-[[aria-invalid=true]]:border-nq-danger',
          (props.invalid || error) && 'border-nq-danger',
          props.disabled && 'cursor-not-allowed opacity-50',
        )
      "
      @click="inputEl?.focus()"
    >
      <NqBadge v-for="(tag, i) in tags" :key="tag" data-slot="tag-input-tag" variant="neutral" class="h-6 gap-0.5 ps-2 pe-0.5 text-body-sm">
        <bdi>{{ tag }}</bdi>
        <button
          type="button"
          :disabled="props.disabled"
          :aria-label="t.remove(tag)"
          class="inline-flex size-5 items-center justify-center rounded-[3px] text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
          @click.stop="removeAt(i)"
        >
          <X aria-hidden="true" class="size-3" />
        </button>
      </NqBadge>
      <input
        ref="inputEl"
        data-slot="tag-input-field"
        :value="text"
        :disabled="props.disabled"
        :placeholder="tags.length ? undefined : (props.placeholder ?? t.placeholder)"
        :role="props.suggestions ? 'combobox' : undefined"
        :aria-expanded="props.suggestions ? showList : undefined"
        :aria-controls="props.suggestions ? listId : undefined"
        :aria-autocomplete="props.suggestions ? 'list' : undefined"
        :aria-activedescendant="showList && active >= 0 ? `${listId}-${active}` : undefined"
        autocomplete="off"
        class="h-7 min-w-24 flex-1 border-0 bg-transparent px-1 text-body outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]"
        v-bind="props.inputProps"
        @input="onInput"
        @keydown="onKeydown"
        @paste="onPaste"
        @focus="open = true"
        @blur="onBlur"
      />
    </div>
    <ul
      v-if="showList"
      :id="listId"
      role="listbox"
      :aria-label="t.suggestions"
      data-slot="tag-input-suggestions"
      class="absolute inset-x-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-floating border border-border bg-popover p-1 text-popover-foreground"
    >
      <!-- mousedown keeps focus in the input, so blur does not close the list before the click lands. -->
      <li
        v-for="(s, i) in filtered"
        :id="`${listId}-${i}`"
        :key="s"
        role="option"
        :aria-selected="i === active"
        :data-active="i === active ? '' : undefined"
        class="cursor-pointer rounded-control px-2 py-1.5 text-body-sm data-active:bg-nq-hover hover:bg-nq-hover"
        @mousedown.prevent
        @click="pick(s)"
      >
        <bdi>{{ s }}</bdi>
      </li>
    </ul>
    <p v-if="error" role="alert" data-slot="tag-input-error" class="mt-1.5 text-caption text-nq-danger-text">{{ error }}</p>
    <span role="status" aria-live="polite" class="sr-only">{{ message }}</span>
    <template v-if="props.name">
      <input v-for="tag in tags" :key="tag" type="hidden" :name="props.name" :value="tag" />
    </template>
  </div>
</template>
