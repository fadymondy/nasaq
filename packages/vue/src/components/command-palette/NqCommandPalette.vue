<script setup lang="ts">
import { ChevronRight, CornerDownLeft, LoaderCircle, Search } from "lucide-vue-next";
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from "reka-ui";
import { computed, isVNode, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import { cn } from "../../lib/cn";
import { presence } from "../../lib/presence";
import { useNasaq } from "../../provider";
import {
  COMMAND_SECTIONS,
  DEFAULT_SECTION_LABELS,
  isApplePlatform,
  normalizeForSearch,
  scoreCommand,
  sectionOrder,
  useCommandPaletteOpen,
  useCommandRegistry,
  useRegisteredCommands,
  type Command,
  type CommandSection,
} from "../commands";
import { NqIcon } from "../icon";
import { NqShortcutKeys } from "../keyboard-shortcuts";
import { NqKbd } from "../text";

// Spotlight search (Raycast, Linear Cmd+K). Reads every command registered with `useRegisterCommands` and every async
// source from `useRegisterCommandSource`. Commands with `children` open a nested page; Backspace on an empty field goes back.
export interface CommandItem {
  id: string;
  label: string;
  icon?: Command["icon"];
  keywords?: string[];
  shortcut?: string;
  hint?: string;
  onSelect?: () => void;
}
export interface CommandGroup {
  id: string;
  label: string;
  items: CommandItem[];
}
interface Props {
  /** Static groups (legacy). They render as their own sections before the registry's. */
  groups?: CommandGroup[];
  /** Extra commands on top of those registered with `useRegisterCommands`. */
  commands?: Command[];
  /** Override section headings, e.g. `{ navigation: "Jump to" }`. Standard ones are localised already. */
  sectionLabels?: Record<string, string>;
  /** v-model:open. Inside an app that called `provideCommands()` it defaults to the shared state, which SearchTrigger also sets. */
  open?: boolean;
  /** Registers Cmd+K / Ctrl+K. */
  hotkey?: boolean;
  placeholder?: string;
  emptyLabel?: string;
  labels?: { title?: string; navigate?: string; select?: string; close?: string; back?: string; searching?: string };
}
interface Section {
  id: string;
  label: string;
  items: Command[];
}
const props = withDefaults(defineProps<Props>(), {
  groups: undefined,
  commands: undefined,
  sectionLabels: undefined,
  open: undefined,
  hotkey: true,
  placeholder: undefined,
  emptyLabel: undefined,
  labels: undefined,
});
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const nq = useNasaq();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const hasRegistry = useCommandRegistry() !== null;
const shared = useCommandPaletteOpen();
const localOpen = ref(false);
const open = computed(() => props.open ?? (hasRegistry ? shared.open.value.paletteOpen : localOpen.value));
function setOpen(next: boolean) {
  if (props.open === undefined) {
    if (hasRegistry) shared.setOpen(next);
    else localOpen.value = next;
  }
  emit("update:open", next);
}
const uid = useId();
const hintId = `${uid}-hint`;
const query = ref("");
const pages = ref<Command[]>([]);
const remote = ref<Command[]>([]);
const searching = ref(false);
const highlighted = ref(0);
const registered = useRegisteredCommands();
const inputEl = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLElement | null>(null);

function onHotkey(event: KeyboardEvent) {
  if (!props.hotkey) return;
  const mod = isApplePlatform() ? event.metaKey : event.ctrlKey;
  if (!mod || event.altKey || event.shiftKey) return;
  if (event.code !== "KeyK" && event.key.toLowerCase() !== "k") return;
  event.preventDefault();
  setOpen(!open.value);
}
onMounted(() => window.addEventListener("keydown", onHotkey));
onBeforeUnmount(() => window.removeEventListener("keydown", onHotkey));

// Every open starts fresh at the root.
watch(open, (isOpen) => {
  if (isOpen) return;
  query.value = "";
  pages.value = [];
  remote.value = [];
});

const page = computed(() => pages.value.at(-1));
const trimmed = computed(() => query.value.trim());

// Async sources: debounced, aborted when the query changes, root page only.
watch(
  [open, page, () => registered.value.sources, trimmed],
  (_n, _o, onCleanup) => {
    const sources = registered.value.sources;
    if (!open.value || page.value || sources.length === 0) {
      searching.value = false;
      return;
    }
    const active = sources.filter((s) => trimmed.value.length >= (s.minQuery ?? 1));
    if (active.length === 0) {
      remote.value = [];
      searching.value = false;
      return;
    }
    const controller = new AbortController();
    const wait = Math.max(...active.map((s) => s.debounce ?? 150));
    searching.value = true;
    const timer = setTimeout(async () => {
      const results = await Promise.allSettled(active.map((s) => s.search(trimmed.value, controller.signal)));
      if (controller.signal.aborted) return;
      remote.value = results.flatMap((r) => (r.status === "fulfilled" ? r.value.map((c) => ({ section: "search", ...c })) : []));
      searching.value = false;
    }, wait);
    onCleanup(() => {
      controller.abort();
      clearTimeout(timer);
    });
  },
  { immediate: true },
);

const fromLegacy = (groups: CommandGroup[] = []): Command[] =>
  groups.flatMap((g, gi) =>
    g.items.map((i) => ({
      id: i.id,
      label: i.label,
      icon: i.icon,
      keywords: i.keywords,
      shortcut: i.shortcut,
      bindShortcut: false,
      hint: i.hint,
      perform: i.onSelect,
      section: g.id,
      sectionLabel: g.label,
      sectionOrder: -1 + gi / 100,
    })),
  );
const resolveChildren = (c: Command) => (typeof c.children === "function" ? c.children() : (c.children ?? []));

function labelOf(c: Command) {
  const id = c.section ?? "context";
  if (props.sectionLabels?.[id]) return props.sectionLabels[id]!;
  if ((COMMAND_SECTIONS as readonly string[]).includes(id)) return DEFAULT_SECTION_LABELS[id as CommandSection][ar.value ? "ar" : "en"];
  return c.sectionLabel ?? id;
}

/** Ranks and groups commands: sections in order, then match quality, then priority, then registration order. */
function arrange(list: Command[], rawQuery: string): Section[] {
  const q = normalizeForSearch(rawQuery);
  const ranked = list
    .map((c, index) => ({ c, index, score: q ? scoreCommand(c, q) : c.searchOnly ? 0 : 1 }))
    .filter((r) => r.score > 0)
    .sort((a, b) => sectionOrder(a.c) - sectionOrder(b.c) || b.score - a.score || (b.c.priority ?? 0) - (a.c.priority ?? 0) || a.index - b.index);
  const sections = new Map<string, Section>();
  for (const { c } of ranked) {
    const id = c.section ?? "context";
    if (!sections.has(id)) sections.set(id, { id, label: labelOf(c), items: [] });
    sections.get(id)!.items.push(c);
  }
  return [...sections.values()];
}

const sections = computed<Section[]>(() => {
  if (page.value) {
    const p = page.value;
    return arrange(resolveChildren(p).map((c) => ({ ...c, section: p.id, sectionLabel: p.label, sectionOrder: 0 })), query.value);
  }
  // Remote results are already matched by their source; keep them whatever the local score.
  const local = arrange([...fromLegacy(props.groups), ...(props.commands ?? []), ...registered.value.commands], query.value);
  const found = remote.value.length ? arrange(remote.value.map((c) => ({ ...c, keywords: [...(c.keywords ?? []), query.value] })), query.value) : [];
  return [...local, ...found].sort((a, b) => sectionOrder(a.items[0]!) - sectionOrder(b.items[0]!));
});
const flat = computed(() => sections.value.flatMap((s) => s.items));
const optionId = (i: number) => `${uid}-opt-${i}`;
const indexOf = (c: Command) => flat.value.indexOf(c);

// The first result is highlighted whenever the list changes.
watch(flat, () => (highlighted.value = Math.max(0, flat.value.findIndex((c) => !c.disabled))));

function run(c: Command) {
  if (c.disabled) return;
  if (c.children) {
    pages.value = [...pages.value, c];
    query.value = "";
    return;
  }
  if (!c.keepOpen) setOpen(false);
  c.perform?.();
}

function move(delta: number, absolute = false) {
  const n = flat.value.length;
  if (!n) return;
  let i = absolute ? (delta < 0 ? 0 : n - 1) : highlighted.value;
  const step = absolute ? (delta < 0 ? 1 : -1) : delta;
  for (let tries = 0; tries < n; tries++) {
    if (!absolute) i = (i + step + n) % n;
    if (!flat.value[i]!.disabled) break;
    if (absolute) i += step;
  }
  highlighted.value = i;
  nextTick(() => listEl.value?.querySelector<HTMLElement>(`#${CSS.escape(optionId(i))}`)?.scrollIntoView?.({ block: "nearest" }));
}

function onKeyDown(e: KeyboardEvent) {
  if (e.isComposing) return;
  if (e.key === "ArrowDown") (e.preventDefault(), move(1));
  else if (e.key === "ArrowUp") (e.preventDefault(), move(-1));
  else if (e.key === "Home") (e.preventDefault(), move(-1, true));
  else if (e.key === "End") (e.preventDefault(), move(1, true));
  else if (e.key === "Enter") {
    const c = flat.value[highlighted.value];
    if (c) (e.preventDefault(), run(c));
  } else if (e.key === "Backspace" && query.value === "" && pages.value.length) {
    e.preventDefault();
    pages.value = pages.value.slice(0, -1);
  }
}

// Esc on a nested page steps back one level; only Esc at the root closes.
function onEscape(event: KeyboardEvent) {
  if (!pages.value.length) return;
  event.preventDefault();
  pages.value = pages.value.slice(0, -1);
  query.value = "";
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
        <DialogOverlay
          v-if="open"
          force-mount
          class="fixed inset-0 z-50 bg-nq-fg/10 transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0 dark:bg-nq-bg/60"
        />
      </Transition>
      <Transition v-bind="presence">
        <div v-if="open" class="pointer-events-none fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12dvh] transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
          <DialogContent
            force-mount
            data-slot="command-palette"
            :aria-describedby="hintId"
            :class="
              cn(
                'pointer-events-auto flex max-h-[min(32rem,76dvh)] w-full max-w-xl flex-col overflow-hidden rounded-floating border border-border bg-popover text-popover-foreground outline-none',
                'shadow-floating',
              )
            "
            @escape-key-down="onEscape"
            @open-auto-focus="onOpenAutoFocus"
          >
            <DialogTitle class="sr-only">{{ props.labels?.title ?? (ar ? "لوحة الأوامر" : "Command palette") }}</DialogTitle>
            <DialogDescription class="sr-only">{{ props.labels?.navigate ?? (ar ? "تنقّل" : "Navigate") }}</DialogDescription>
            <div class="flex items-center gap-2 border-b border-border px-4">
              <LoaderCircle v-if="searching" aria-hidden="true" class="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" />
              <Search v-else aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
              <button
                v-for="(p, i) in pages"
                :key="p.id"
                type="button"
                class="flex h-6 shrink-0 items-center gap-1 rounded-[4px] bg-nq-selected px-1.5 text-caption font-medium text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
                @click="pages = pages.slice(0, i + 1)"
              >
                {{ p.label }}
                <NqIcon :icon="ChevronRight" directional class="size-3 text-muted-foreground" />
              </button>
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
                :placeholder="page ? (ar ? 'تصفية…' : 'Filter…') : (props.placeholder ?? (ar ? 'ابحث أو نفّذ أمرًا…' : 'Search or run a command…'))"
                class="h-12 w-full bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]"
                @keydown="onKeyDown"
              />
              <DialogClose class="shrink-0 rounded-[3px] outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                <NqKbd>Esc</NqKbd>
                <span class="sr-only">{{ props.labels?.close ?? (ar ? "إغلاق" : "Close") }}</span>
              </DialogClose>
            </div>

            <div ref="listEl" class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 [scroll-padding-block:0.375rem]">
              <div v-if="flat.length === 0" class="flex min-h-24 items-center justify-center text-body-sm text-muted-foreground">
                {{ searching ? (props.labels?.searching ?? (ar ? "جارٍ البحث…" : "Searching…")) : (props.emptyLabel ?? (ar ? "لا نتائج" : "No results")) }}
              </div>
              <div :id="`${uid}-list`" role="listbox" :aria-label="props.labels?.title ?? (ar ? 'لوحة الأوامر' : 'Command palette')">
                <div v-for="section in sections" :key="section.id" role="group" :aria-labelledby="`${uid}-g-${section.id}`" class="not-last:mb-1.5">
                  <div :id="`${uid}-g-${section.id}`" :class="cn('px-2.5 pt-2 pb-1 text-caption font-medium text-muted-foreground', page && 'sr-only')">{{ section.label }}</div>
                  <div
                    v-for="item in section.items"
                    :id="optionId(indexOf(item))"
                    :key="item.id"
                    role="option"
                    :aria-selected="indexOf(item) === highlighted"
                    :aria-disabled="item.disabled || undefined"
                    :data-highlighted="indexOf(item) === highlighted ? '' : undefined"
                    :data-disabled="item.disabled ? '' : undefined"
                    :class="
                      cn(
                        'group flex h-10 min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-3 rounded-control px-2.5 text-body-sm text-foreground outline-none',
                        '[scroll-margin-block:0.375rem] data-highlighted:bg-nq-selected data-disabled:opacity-50',
                        '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground data-highlighted:[&_svg]:text-foreground',
                      )
                    "
                    @mousemove="highlighted = indexOf(item)"
                    @click="run(item)"
                  >
                    <template v-if="item.icon">
                      <span v-if="isVNode(item.icon)" class="flex size-4 shrink-0 items-center justify-center"><component :is="item.icon" /></span>
                      <component :is="item.icon" v-else aria-hidden="true" />
                    </template>
                    <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
                    <span v-if="item.hint" class="shrink-0 text-caption text-muted-foreground">
                      <component :is="item.hint" v-if="isVNode(item.hint)" />
                      <template v-else>{{ item.hint }}</template>
                    </span>
                    <NqShortcutKeys v-if="item.shortcut" :shortcut="item.shortcut" class="shrink-0" />
                    <NqIcon v-if="item.children" :icon="ChevronRight" directional class="size-3.5!" />
                  </div>
                </div>
              </div>
            </div>

            <div :id="hintId" class="flex items-center gap-4 border-t border-border bg-nq-surface-soft px-4 py-2 text-caption text-muted-foreground">
              <span class="flex items-center gap-1.5">
                <NqKbd>↑</NqKbd>
                <NqKbd>↓</NqKbd>
                {{ props.labels?.navigate ?? (ar ? "تنقّل" : "Navigate") }}
              </span>
              <span class="flex items-center gap-1.5">
                <NqKbd><CornerDownLeft class="size-3" aria-hidden="true" /></NqKbd>
                {{ props.labels?.select ?? (ar ? "فتح" : "Open") }}
              </span>
              <span v-if="pages.length" class="flex items-center gap-1.5">
                <NqKbd>⌫</NqKbd>
                {{ props.labels?.back ?? (ar ? "رجوع" : "Back") }}
              </span>
            </div>
          </DialogContent>
        </div>
      </Transition>
    </DialogPortal>
  </DialogRoot>
</template>
