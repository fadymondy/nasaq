<script setup lang="ts">
import { CornerDownLeft, Sparkles } from "lucide-vue-next";
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from "reka-ui";
import { computed, nextTick, ref, useId, watch } from "vue";
import { presence } from "../../lib/presence";
import { useNasaq } from "../../provider";
import { useShortcutApple } from "../keyboard-shortcuts";
import { NqKbd } from "../text";
import { groupAiActions } from "./ai-states-logic";
import { aiStatesWords, type AiStatesLabels } from "./labels";
import { aiShortcutKeys, useAiModHotkey } from "./shortcut";
import type { AiAction } from "./types";

// The Cmd+J (Ctrl+J) menu: search the AI actions, with the ones that fit the current context listed first under Recommended.
const props = withDefaults(
  defineProps<{
    actions: readonly AiAction[];
    /** Runs the chosen action. The menu closes first. */
    onAction?: (id: string) => void;
    /** v-model:open. */
    open?: boolean;
    /** Registers Cmd+J / Ctrl+J. Default true. */
    hotkey?: boolean;
    /** Placeholder of the search box. */
    placeholder?: string;
    labels?: Partial<AiStatesLabels>;
  }>(),
  { open: undefined, hotkey: true, placeholder: undefined, labels: undefined },
);
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const nq = useNasaq();
const t = computed(() => aiStatesWords(nq.locale.value, props.labels));
const apple = useShortcutApple();
const keysOf = (s: string) => aiShortcutKeys(s, apple.value);
const local = ref(false);
const open = computed(() => props.open ?? local.value);
function setOpen(next: boolean) {
  if (props.open === undefined) local.value = next;
  emit("update:open", next);
}
const uid = useId();
const hintId = `${uid}-hint`;
const query = ref("");
const highlighted = ref(0);
const inputEl = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLElement | null>(null);
useAiModHotkey("j", () => setOpen(!open.value), () => props.hotkey);
watch(open, (o) => {
  if (!o) query.value = "";
});

interface Section {
  id: string;
  label: string;
  items: AiAction[];
}
const sections = computed<Section[]>(() => {
  const g = groupAiActions(props.actions, query.value);
  const out: Section[] = [];
  if (g.recommended.length) out.push({ id: "recommended", label: t.value.recommended, items: g.recommended as AiAction[] });
  if (g.others.length) out.push({ id: "all", label: g.recommended.length ? t.value.allActions : query.value.trim() ? t.value.actionsTitle : t.value.allActions, items: g.others as AiAction[] });
  return out;
});
const flat = computed(() => sections.value.flatMap((s) => s.items));
const optionId = (i: number) => `${uid}-opt-${i}`;
const indexOf = (a: AiAction) => flat.value.indexOf(a);
watch(flat, () => (highlighted.value = Math.max(0, flat.value.findIndex((a) => !a.disabled))));

function run(a: AiAction) {
  if (a.disabled) return;
  setOpen(false);
  props.onAction?.(a.id);
}
function move(delta: number) {
  const n = flat.value.length;
  if (!n) return;
  let i = highlighted.value;
  for (let tries = 0; tries < n; tries++) {
    i = (i + delta + n) % n;
    if (!flat.value[i]!.disabled) break;
  }
  highlighted.value = i;
  nextTick(() => listEl.value?.querySelector<HTMLElement>(`#${CSS.escape(optionId(i))}`)?.scrollIntoView?.({ block: "nearest" }));
}
function onKeyDown(e: KeyboardEvent) {
  if (e.isComposing) return;
  if (e.key === "ArrowDown") (e.preventDefault(), move(1));
  else if (e.key === "ArrowUp") (e.preventDefault(), move(-1));
  else if (e.key === "Enter") {
    const a = flat.value[highlighted.value];
    if (a) (e.preventDefault(), run(a));
  }
}
function onOpenAutoFocus(event: Event) {
  event.preventDefault();
  inputEl.value?.focus();
}
</script>

<template>
  <DialogRoot :open="open" @update:open="setOpen">
    <DialogPortal>
      <Transition v-bind="presence">
        <DialogOverlay v-if="open" force-mount class="fixed inset-0 z-50 bg-nq-fg/10 transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0 dark:bg-nq-bg/60" />
      </Transition>
      <Transition v-bind="presence">
        <div v-if="open" class="pointer-events-none fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12dvh] transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
          <DialogContent
            force-mount
            data-slot="ai-action-menu"
            :aria-label="t.actionsTitle"
            :aria-describedby="hintId"
            class="pointer-events-auto flex max-h-[min(30rem,76dvh)] w-full max-w-lg flex-col overflow-hidden rounded-floating border border-border bg-popover text-popover-foreground shadow-floating outline-none transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0"
            @open-auto-focus="onOpenAutoFocus"
          >
            <DialogTitle class="sr-only">{{ t.actionsTitle }}</DialogTitle>
            <DialogDescription class="sr-only">{{ t.navigate }}</DialogDescription>
            <div class="flex items-center gap-2 border-b border-border px-4">
              <Sparkles aria-hidden="true" class="size-4 shrink-0 text-nq-accent-text" />
              <input
                ref="inputEl"
                v-model="query"
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-autocomplete="list"
                :aria-controls="`${uid}-list`"
                :aria-activedescendant="flat.length ? optionId(highlighted) : undefined"
                :aria-describedby="hintId"
                autocomplete="off"
                spellcheck="false"
                :placeholder="props.placeholder ?? t.actionsPlaceholder"
                class="h-12 w-full bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]"
                @keydown="onKeyDown"
              />
              <DialogClose class="shrink-0 rounded-[3px] outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                <NqKbd>Esc</NqKbd>
                <span class="sr-only">{{ t.close }}</span>
              </DialogClose>
            </div>
            <div ref="listEl" class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
              <div v-if="flat.length === 0" class="flex min-h-20 items-center justify-center text-body-sm text-muted-foreground">{{ t.noActions }}</div>
              <div :id="`${uid}-list`" role="listbox" :aria-label="t.actionsTitle">
                <div v-for="section in sections" :key="section.id" role="group" :aria-labelledby="`${uid}-g-${section.id}`" class="not-last:mb-1.5">
                  <div :id="`${uid}-g-${section.id}`" class="px-2.5 pt-2 pb-1 text-caption font-medium text-muted-foreground">{{ section.label }}</div>
                  <div
                    v-for="item in section.items"
                    :id="optionId(indexOf(item))"
                    :key="item.id"
                    role="option"
                    :aria-selected="indexOf(item) === highlighted"
                    :aria-disabled="item.disabled || undefined"
                    :data-highlighted="indexOf(item) === highlighted ? '' : undefined"
                    :data-disabled="item.disabled ? '' : undefined"
                    class="flex min-h-10 cursor-default select-none items-center gap-3 rounded-control px-2.5 py-1.5 text-body-sm text-foreground outline-none data-highlighted:bg-nq-selected data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
                    @mousemove="highlighted = indexOf(item)"
                    @click="run(item)"
                  >
                    <component :is="item.icon" v-if="item.icon" aria-hidden="true" />
                    <Sparkles v-else aria-hidden="true" />
                    <span class="flex min-w-0 flex-1 flex-col">
                      <span dir="auto" class="truncate">{{ item.label }}</span>
                      <span v-if="item.description" dir="auto" class="truncate text-caption text-muted-foreground">{{ item.description }}</span>
                    </span>
                    <span v-if="item.shortcut" dir="ltr" class="inline-flex gap-0.5">
                      <NqKbd v-for="k in keysOf(item.shortcut)" :key="k">{{ k }}</NqKbd>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div :id="hintId" class="flex items-center gap-4 border-t border-border bg-nq-surface-soft px-4 py-2 text-caption text-muted-foreground">
              <span class="flex items-center gap-1.5">
                <NqKbd>↑</NqKbd>
                <NqKbd>↓</NqKbd>
                {{ t.navigate }}
              </span>
              <span class="flex items-center gap-1.5">
                <NqKbd><CornerDownLeft aria-hidden="true" class="size-3" /></NqKbd>
                {{ t.run }}
              </span>
            </div>
          </DialogContent>
        </div>
      </Transition>
    </DialogPortal>
  </DialogRoot>
</template>
