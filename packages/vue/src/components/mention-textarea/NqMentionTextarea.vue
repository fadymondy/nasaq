<script setup lang="ts">
import { Users } from "lucide-vue-next";
import { computed, nextTick, onMounted, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAvatar } from "../avatar";
import { normalizeForSearch } from "../commands";
import { NqTextarea } from "../field";
import { formatNumber } from "../numeric";
import { NqPresenceDot } from "../profile-card";
import { caretPoint, findActive, syncMentions, validOnly, type Mention, type MentionOption } from "./mention-logic";
import { kindOf, rankOptions } from "./mention-model";

defineOptions({ inheritAttrs: false });

const STRINGS = {
  en: {
    list: "Mentions",
    empty: "No matches",
    count: (n: string) => `${n} suggestions`,
    person: "People",
    team: "Teams",
    group: "Groups",
    teamOne: "Team",
    groupOne: "Group",
  },
  ar: {
    list: "الإشارات",
    empty: "لا نتائج",
    count: (n: string) => `${n} اقتراحات`,
    person: "الأشخاص",
    team: "الفرق",
    group: "المجموعات",
    teamOne: "فريق",
    groupOne: "مجموعة",
  },
};

// A Textarea that suggests people when you type the trigger (`@`). Focus stays in the textarea (ARIA combobox with a
// listbox); choosing a suggestion inserts `@name` and reports it in the `mentions` array. Works inside `NqField`.
interface Props {
  /** The text. Use `v-model`. Omit to let the component own it. */
  modelValue?: string;
  defaultValue?: string;
  /** Every mention still in the text, in text order. Use `v-model:mentions`. */
  mentions?: Mention[];
  /** Mentions of an initial or controlled `modelValue`. Mentions whose text no longer matches are dropped. */
  defaultMentions?: Mention[];
  /** People (or anything mentionable) offered in the list. */
  suggestions: MentionOption[];
  /** The character that opens the list. Default "@". */
  trigger?: string;
  /** Most rows shown in all. Default 8. */
  maxSuggestions?: number;
  /** Listbox name. Default "Mentions" / "الإشارات". */
  listLabel?: string;
  /** Shown when nothing matches. Default "No matches" / "لا نتائج". */
  emptyLabel?: string;
  /** Class of the wrapper (the textarea takes `class`). */
  wrapperClass?: HTMLAttributes["class"];
  /** Class of the textarea. */
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: "",
  mentions: undefined,
  defaultMentions: undefined,
  trigger: "@",
  maxSuggestions: 8,
  listLabel: undefined,
  emptyLabel: undefined,
  wrapperClass: undefined,
});
const emit = defineEmits<{
  "update:modelValue": [value: string];
  /** Called with every mention still in the text, in text order. */
  "update:mentions": [mentions: Mention[]];
}>();

const nq = useNasaq();
const t = computed(() => STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"]);
const listId = useId();
const optionId = (index: number) => `${listId}-opt-${index}`;
const area = ref<{ $el: HTMLTextAreaElement } | null>(null);
const wrapper = ref<HTMLDivElement | null>(null);
const el = () => area.value?.$el ?? null;

const inner = ref(props.defaultValue);
const value = computed(() => (props.modelValue === undefined ? inner.value : props.modelValue));
const rawMentions = ref<Mention[]>(props.mentions ?? props.defaultMentions ?? []);
watch(
  () => props.mentions,
  (m) => {
    if (m) rawMentions.value = m;
  },
);
const mentionsNow = computed(() => validOnly(rawMentions.value, value.value, props.trigger));

const caret = ref(0);
const focused = ref(false);
const dismissed = ref<number | null>(null);
const activeIndex = ref(0);
const point = ref({ top: 0, left: 0 });

const active = computed(() => (focused.value ? findActive(value.value, caret.value, props.trigger) : null));
const shown = computed(() => (active.value && dismissed.value !== active.value.start ? active.value : null));
const results = computed(() => (shown.value ? rankOptions(props.suggestions, shown.value.query, normalizeForSearch, props.maxSuggestions) : []));
const sectioned = computed(() => new Set(props.suggestions.map(kindOf)).size > 1);
const open = computed(() => shown.value !== null && results.value.length > 0);
const activeOption = computed(() => (open.value ? Math.min(activeIndex.value, results.value.length - 1) : -1));
// Escape only silences the mention being typed; the next trigger opens the list again.
watch(active, (a) => {
  if (dismissed.value !== null && !a) dismissed.value = null;
});

// Anchor the list at the caret.
watch(
  [() => shown.value?.start, value],
  () => {
    const start = shown.value?.start;
    const textarea = el();
    if (start === undefined || !textarea) return;
    const p = caretPoint(textarea, start);
    const width = wrapper.value?.clientWidth ?? 0;
    point.value = { top: p.top, left: Math.max(0, Math.min(p.left, width - 256)) };
  },
  { flush: "post" },
);

// Keep the highlighted option visible while arrowing.
watch(
  activeOption,
  (i) => {
    if (i >= 0) document.getElementById(optionId(i))?.scrollIntoView?.({ block: "nearest" });
  },
  { flush: "post" },
);

const commit = (next: string, nextMentions: Mention[]) => {
  if (props.modelValue === undefined) inner.value = next;
  rawMentions.value = nextMentions;
  emit("update:modelValue", next);
  emit("update:mentions", nextMentions);
};

function onInput(next: string | undefined) {
  const text = next ?? "";
  const textarea = el();
  if (textarea) caret.value = textarea.selectionStart;
  activeIndex.value = 0;
  commit(text, validOnly(syncMentions(mentionsNow.value, value.value, text), text, props.trigger));
}

const track = () => {
  const textarea = el();
  if (textarea) caret.value = textarea.selectionStart;
};

async function select(option: MentionOption) {
  const current = shown.value;
  if (!current) return;
  const insert = `${props.trigger}${option.name}`;
  const next = `${value.value.slice(0, current.start)}${insert} ${value.value.slice(current.caret)}`;
  const kept = syncMentions(mentionsNow.value, value.value, next);
  const mention: Mention = { id: option.id, name: option.name, start: current.start, end: current.start + insert.length };
  const all = [...kept, mention].sort((a, b) => a.start - b.start);
  activeIndex.value = 0;
  commit(next, all);
  const textarea = el();
  textarea?.focus();
  // Restore the caret after the value we set programmatically has been rendered.
  await nextTick();
  const target = el();
  if (target) {
    target.setSelectionRange(mention.end + 1, mention.end + 1);
    caret.value = mention.end + 1;
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.defaultPrevented || !open.value) return;
  const list = results.value;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeIndex.value = (activeOption.value + 1) % list.length;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeIndex.value = (activeOption.value - 1 + list.length) % list.length;
  } else if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey && !e.isComposing) {
    const option = list[activeOption.value];
    if (option) {
      e.preventDefault();
      void select(option);
    }
  } else if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    dismissed.value = shown.value?.start ?? null;
  }
}

onMounted(() => {
  if (document.activeElement === el()) focused.value = true;
});

const count = computed(() => formatNumber(results.value.length, nq.locale.value));
const headingFor = (index: number) => sectioned.value && (index === 0 || kindOf(results.value[index - 1] as MentionOption) !== kindOf(results.value[index] as MentionOption));
const status = computed(() => (open.value ? t.value.count(count.value) : shown.value && shown.value.query ? (props.emptyLabel ?? t.value.empty) : ""));
</script>

<template>
  <div ref="wrapper" data-slot="mention-textarea" :class="cn('relative w-full', props.wrapperClass)">
    <NqTextarea
      ref="area"
      v-bind="$attrs"
      role="combobox"
      aria-autocomplete="list"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="open ? listId : undefined"
      :aria-activedescendant="open && activeOption >= 0 ? optionId(activeOption) : undefined"
      :class="props.class"
      :model-value="value"
      @update:model-value="onInput"
      @keydown="onKeyDown"
      @keyup="track"
      @click="track"
      @select="track"
      @focus="(focused = true), track()"
      @blur="focused = false"
    />
    <ul
      v-if="open"
      :id="listId"
      role="listbox"
      :aria-label="props.listLabel ?? t.list"
      data-slot="mention-list"
      :style="{ top: `${point.top}px`, left: `${point.left}px` }"
      class="absolute z-50 max-h-56 w-64 max-w-full overflow-y-auto rounded-floating border border-border bg-popover p-1 text-body-sm text-popover-foreground shadow-floating"
      @mousedown.prevent
    >
      <template v-for="(option, index) in results" :key="option.id">
        <li v-if="headingFor(index)" role="presentation" data-slot="mention-heading" class="px-2 pt-1.5 pb-1 text-caption text-muted-foreground">
          {{ t[kindOf(option)] }}
        </li>
        <li
          :id="optionId(index)"
          role="option"
          :aria-selected="index === activeOption"
          data-slot="mention-option"
          :data-kind="kindOf(option)"
          :data-active="index === activeOption ? '' : undefined"
          class="flex cursor-default items-center gap-2 rounded-control px-2 py-1.5 data-active:bg-nq-selected"
          @mousemove="activeIndex = index"
          @click="select(option)"
        >
          <span v-if="kindOf(option) === 'person'" class="relative inline-flex shrink-0">
            <NqAvatar :name="option.name" :src="option.avatar" size="sm" aria-hidden="true" />
            <NqPresenceDot v-if="option.presence" :presence="option.presence" decorative class="absolute -end-0.5 -bottom-0.5 border-2 border-popover" />
          </span>
          <span v-else aria-hidden="true" class="inline-flex size-6 shrink-0 items-center justify-center rounded-control bg-secondary text-secondary-foreground">
            <Users class="size-3.5" />
          </span>
          <span class="flex min-w-0 flex-col">
            <span class="truncate text-label text-foreground">
              {{ option.name }}
              <span v-if="kindOf(option) !== 'person'" class="sr-only"> ({{ kindOf(option) === "team" ? t.teamOne : t.groupOne }})</span>
            </span>
            <span v-if="option.description" class="truncate text-caption text-muted-foreground">{{ option.description }}</span>
          </span>
        </li>
      </template>
    </ul>
    <div
      v-else-if="shown && shown.query"
      data-slot="mention-empty"
      :style="{ top: `${point.top}px`, left: `${point.left}px` }"
      class="absolute z-50 w-64 max-w-full rounded-floating border border-border bg-popover px-3 py-2 text-body-sm text-muted-foreground shadow-floating"
    >
      {{ props.emptyLabel ?? t.empty }}
    </div>
    <span role="status" class="sr-only">{{ status }}</span>
  </div>
</template>
