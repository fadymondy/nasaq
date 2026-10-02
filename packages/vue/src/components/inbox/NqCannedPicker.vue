<script setup lang="ts">
import { Zap } from "lucide-vue-next";
import { computed, ref, useId, watch } from "vue";
import { NqButton } from "../button";
import { NqInput } from "../field";
import { NqPopover, NqPopoverContent, NqPopoverTrigger, type PopupSide } from "../popover";
import { applySnippet, filterSnippets, type CannedSnippet } from "./inbox-format";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";

// Saved replies in a popover: search by shortcut, title or text, arrow keys and Enter to insert.
// The `trigger` slot replaces the default zap button (give its element an accessible name); the `footer` slot sits under the list.
const props = withDefaults(
  defineProps<{
    snippets: readonly CannedSnippet[];
    /** Called with the snippet body after the variables are filled. */
    onPick: (text: string, snippet: CannedSnippet) => void;
    /** Values for `{{name}}` style variables in snippet bodies. */
    variables?: Record<string, string | undefined>;
    side?: PopupSide;
    labels?: Partial<InboxLabels>;
  }>(),
  { variables: () => ({}), side: "top" },
);
const open = defineModel<boolean>("open", { default: false });
const t = useInboxLabels(() => props.labels);
const id = useId();
const query = ref("");
const active = ref(0);
const list = computed(() => filterSnippets(props.snippets, query.value));

watch(open, (isOpen) => {
  if (!isOpen) {
    query.value = "";
    active.value = 0;
  }
});

function pick(s: CannedSnippet) {
  props.onPick(applySnippet(s.body, props.variables), s);
  open.value = false;
}
function onKey(e: KeyboardEvent) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    active.value = Math.min(list.value.length - 1, active.value + 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    active.value = Math.max(0, active.value - 1);
  } else if (e.key === "Enter" && list.value[active.value]) {
    e.preventDefault();
    pick(list.value[active.value] as CannedSnippet);
  }
}
</script>

<template>
  <NqPopover v-model:open="open">
    <NqPopoverTrigger as-child>
      <slot name="trigger">
        <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.snippets">
          <Zap aria-hidden="true" />
        </NqButton>
      </slot>
    </NqPopoverTrigger>
    <NqPopoverContent :side="props.side" align="start" class="flex w-80 flex-col gap-2 p-2">
      <NqInput
        v-model="query"
        role="combobox"
        aria-expanded="true"
        :aria-controls="`${id}-list`"
        :aria-activedescendant="list[active] ? `${id}-${list[active]?.id}` : undefined"
        :aria-label="t.snippetSearch"
        :placeholder="t.snippetSearch"
        autofocus
        @update:model-value="active = 0"
        @keydown="onKey"
      />
      <ul :id="`${id}-list`" role="listbox" :aria-label="t.snippets" class="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
        <li v-if="list.length === 0" role="presentation" class="px-2 py-3 text-center text-body-sm text-muted-foreground">{{ t.snippetsEmpty }}</li>
        <li
          v-for="(s, i) in list"
          v-else
          :id="`${id}-${s.id}`"
          :key="s.id"
          role="option"
          :aria-selected="i === active"
          tabindex="-1"
          :class="['flex cursor-pointer flex-col gap-0.5 rounded-control px-2 py-1.5 text-start', i === active && 'bg-nq-hover']"
          @mouseenter="active = i"
          @click="pick(s)"
          @keydown.enter="pick(s)"
        >
          <span class="flex items-center gap-2">
            <span dir="auto" class="flex-1 truncate text-label text-foreground">{{ s.title }}</span>
            <kbd dir="ltr" class="rounded-[4px] border border-border bg-secondary px-1 font-mono text-caption text-muted-foreground">/{{ s.shortcut }}</kbd>
          </span>
          <span dir="auto" class="line-clamp-2 text-caption text-muted-foreground">{{ applySnippet(s.body, props.variables) }}</span>
        </li>
      </ul>
      <slot name="footer" />
    </NqPopoverContent>
  </NqPopover>
</template>
