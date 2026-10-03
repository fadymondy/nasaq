<script setup lang="ts">
import { ArrowUp, Maximize2, Minimize2, PanelBottom, PanelLeft, PanelRight, PictureInPicture2, Sparkles } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useAttrs, useId, watch, type CSSProperties, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqCopilotChat, type CopilotMessage, type CopilotSendMeta } from "../copilot-chat";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuLabel, NqDropdownMenuRadioGroup, NqDropdownMenuRadioItem, NqDropdownMenuTrigger } from "../dropdown-menu";
import { isApplePlatform } from "../keyboard-shortcuts/keyboard-shortcuts";
import type { CopilotDockSide } from "./copilot-dock-types";
import { copilotDockWords, type CopilotDockLabels } from "./labels";

// The app-wide assistant: a launcher (a round button or a slim "Ask anything" bar) that opens NqCopilotChat in a non-modal panel. The panel
// docks to either edge or the bottom, floats as a window, or expands to the whole page. Cmd+J / Ctrl+J toggles it from anywhere; Escape inside
// the panel closes it and returns focus to the launcher. Every other attribute and callback (messages, onSend, onStop, starters, models, ...)
// goes to the NqCopilotChat inside; the header menu and expand button join its `header-actions`.
defineOptions({ inheritAttrs: false });

const SIDES: readonly CopilotDockSide[] = ["end", "start", "bottom", "float"];

const props = withDefaults(
  defineProps<{
    /** The conversation, as for NqCopilotChat. */
    messages: readonly CopilotMessage[];
    /** A prompt from the box, a starter or the collapsed bar. */
    onSend: (text: string, meta: CopilotSendMeta) => void | Promise<void>;
    /** v-model:open. */
    open?: boolean;
    defaultOpen?: boolean;
    /** Letter bound to Cmd / Ctrl to toggle the dock. Default "j". `false` turns the shortcut off. */
    hotkey?: string | false;
    /** Show the floating launcher button while the dock is closed. Default true. */
    launcher?: boolean;
    /** While closed, show a slim "Ask anything" bar at the bottom instead of the round launcher. Enter sends and opens. */
    collapsedBar?: boolean;
    /** `fixed` docks to the viewport, `absolute` to a `relative` parent (previews). Default `fixed`. */
    placement?: "fixed" | "absolute";
    /** v-model:side. */
    side?: CopilotDockSide;
    /** Default `end`. */
    defaultSide?: CopilotDockSide;
    /** Positions offered in the header menu. Default all four; one or none hides the menu. */
    sides?: readonly CopilotDockSide[];
    /** v-model:expanded. */
    expanded?: boolean;
    defaultExpanded?: boolean;
    /** Show the expand button in the header. Default true. */
    expandable?: boolean;
    /** A localStorage key that remembers the position across visits. Default off. */
    persistKey?: string;
    /** Width of a side or floating panel. Default 26rem, never wider than the screen. */
    width?: string;
    /** Height of a bottom or floating panel. Default 50vh for bottom, 40rem for float. */
    height?: string;
    dockLabels?: Partial<CopilotDockLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  {
    open: undefined,
    defaultOpen: false,
    hotkey: "j",
    launcher: true,
    collapsedBar: false,
    placement: "fixed",
    side: undefined,
    defaultSide: "end",
    sides: () => ["end", "start", "bottom", "float"],
    expanded: undefined,
    defaultExpanded: false,
    expandable: true,
    persistKey: undefined,
    width: "26rem",
    height: undefined,
    dockLabels: undefined,
  },
);
const emit = defineEmits<{ "update:open": [open: boolean]; "update:side": [side: CopilotDockSide]; "update:expanded": [expanded: boolean] }>();
const attrs = useAttrs();
const chatAttrs = computed(() => {
  const { class: _c, style: _s, ...rest } = attrs;
  return rest;
});

const nq = useNasaq();
const t = computed(() => copilotDockWords(nq.locale.value, props.dockLabels));
const rtl = computed(() => nq.isRtl.value);
const inner = ref(props.defaultOpen);
const open = computed(() => props.open ?? inner.value);
const innerSide = ref<CopilotDockSide>(props.defaultSide);
const side = computed(() => props.side ?? innerSide.value);
const innerExpanded = ref(props.defaultExpanded);
const expanded = computed(() => props.expanded ?? innerExpanded.value);
const panelId = useId();
const panelEl = ref<HTMLElement | null>(null);
const launcherEl = ref<HTMLButtonElement | null>(null);
const barEl = ref<HTMLInputElement | null>(null);
const shortcut = ref<string | null>(null);
const barText = ref("");

function setOpen(next: boolean) {
  inner.value = next;
  emit("update:open", next);
}
function setSide(next: CopilotDockSide) {
  innerSide.value = next;
  emit("update:side", next);
  if (props.persistKey) {
    try {
      window.localStorage.setItem(props.persistKey, next);
    } catch {
      // Storage can be off; the choice still holds for this visit.
    }
  }
}
function setExpanded(next: boolean) {
  innerExpanded.value = next;
  emit("update:expanded", next);
}

function readSide(key: string | undefined): CopilotDockSide | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(key);
    return SIDES.includes(v as CopilotDockSide) ? (v as CopilotDockSide) : null;
  } catch {
    return null;
  }
}

function onHotkey(event: KeyboardEvent) {
  if (props.hotkey === false) return;
  const key = props.hotkey || "j";
  const mod = isApplePlatform() ? event.metaKey : event.ctrlKey;
  if (!mod || event.altKey || event.shiftKey) return;
  const code = key.length === 1 ? `Key${key.toUpperCase()}` : key;
  if (event.code !== code && event.key.toLowerCase() !== key.toLowerCase()) return;
  event.preventDefault();
  setOpen(!open.value);
}
onMounted(() => {
  // A saved position is only readable in the browser, after the first render.
  const saved = readSide(props.persistKey);
  if (saved && props.side === undefined) innerSide.value = saved;
  // The modifier depends on the platform, which is only known in the browser.
  if (props.hotkey) shortcut.value = `${isApplePlatform() ? "⌘" : "Ctrl+"}${props.hotkey.toUpperCase()}`;
  window.addEventListener("keydown", onHotkey);
});
onBeforeUnmount(() => window.removeEventListener("keydown", onHotkey));

// Move focus into the panel on open, so keyboard users land in the conversation.
watch(open, async (isOpen, was) => {
  if (!isOpen || was) return;
  await nextTick();
  const field = panelEl.value?.querySelector<HTMLElement>("textarea, [contenteditable='true']");
  (field ?? panelEl.value)?.focus();
});

function close() {
  setOpen(false);
  setExpanded(false);
  requestAnimationFrame(() => (props.collapsedBar ? barEl.value : launcherEl.value)?.focus());
}

function sendFromBar() {
  const text = barText.value.trim();
  if (!text) {
    setOpen(true);
    return;
  }
  barText.value = "";
  setOpen(true);
  void props.onSend(text, { context: [...((attrs.context as []) ?? [])], model: attrs.model as string | undefined, mentions: [], attachments: [], commands: [], toggles: [] });
}

const menuSides = computed(() => props.sides.filter((s) => SIDES.includes(s)));
// Physical icons for the logical sides: "end" is the right edge in English and the left in Arabic.
const SIDE_ICON = { end: PanelRight, start: PanelLeft, bottom: PanelBottom, float: PictureInPicture2 } as const;
const iconFor = (s: CopilotDockSide) => SIDE_ICON[s === "end" ? (rtl.value ? "start" : "end") : s === "start" ? (rtl.value ? "end" : "start") : s];
const SideIcon = computed(() => iconFor(side.value));

const shape: Record<CopilotDockSide, string> = {
  end: "inset-y-0 end-0 border-s",
  start: "inset-y-0 start-0 border-e",
  bottom: "inset-x-0 bottom-0 border-t",
  float: "bottom-4 end-4 max-h-[calc(100%-2rem)] max-w-[calc(100%-2rem)] rounded-card border",
};
const size = computed<CSSProperties>(() =>
  expanded.value
    ? {}
    : side.value === "bottom"
      ? { height: `min(100%, ${props.height ?? "50vh"})` }
      : side.value === "float"
        ? { width: props.width, height: props.height ?? "40rem" }
        : { width: `min(100%, ${props.width})` },
);
const launcherName = computed(() => (shortcut.value ? `${t.value.open} (${shortcut.value})` : t.value.open));
const keys = computed(() => (props.hotkey ? `${isApplePlatform() ? "Meta" : "Control"}+${props.hotkey.toUpperCase()}` : undefined));

function onPanelKey(event: KeyboardEvent) {
  if (event.key === "Escape" && !event.defaultPrevented) {
    event.stopPropagation();
    if (expanded.value) setExpanded(false);
    else close();
  }
}
</script>

<template>
  <button
    v-if="props.launcher && !open && !props.collapsedBar"
    ref="launcherEl"
    type="button"
    data-slot="copilot-dock-launcher"
    :aria-expanded="false"
    :aria-controls="panelId"
    :aria-keyshortcuts="keys"
    :title="launcherName"
    :aria-label="t.open"
    :class="
      cn(
        props.placement,
        'bottom-4 end-4 z-40 inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-floating',
        'transition-colors duration-150 ease-nq hover:bg-primary/90 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-5',
      )
    "
    @click="setOpen(true)"
  >
    <slot name="launcher-icon"><Sparkles aria-hidden="true" /></slot>
  </button>
  <form
    v-if="props.launcher && !open && props.collapsedBar"
    data-slot="copilot-dock-bar"
    role="search"
    :aria-label="t.panel"
    :class="
      cn(
        props.placement,
        'inset-x-0 bottom-4 z-40 mx-auto flex w-[min(calc(100%-2rem),36rem)] items-center gap-2 rounded-full border border-border bg-background ps-3 pe-1.5 py-1.5 shadow-floating',
        'focus-within:border-nq-focus',
      )
    "
    @submit.prevent="sendFromBar"
  >
    <span aria-hidden="true" class="text-primary [&_svg]:size-4"><slot name="launcher-icon"><Sparkles /></slot></span>
    <input
      ref="barEl"
      v-model="barText"
      :aria-label="t.ask"
      :aria-controls="panelId"
      :aria-keyshortcuts="keys"
      :placeholder="t.ask"
      class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
    />
    <kbd v-if="shortcut && !barText" dir="ltr" class="hidden rounded-sm border border-border px-1 font-mono text-[11px] text-muted-foreground sm:inline">{{ shortcut }}</kbd>
    <NqButton type="submit" size="icon-sm" class="rounded-full" :aria-label="barText.trim() ? t.send : t.open">
      <ArrowUp v-if="barText.trim()" aria-hidden="true" />
      <Maximize2 v-else aria-hidden="true" />
    </NqButton>
  </form>
  <div
    :id="panelId"
    ref="panelEl"
    role="complementary"
    :aria-label="t.panel"
    tabindex="-1"
    :hidden="!open"
    data-slot="copilot-dock"
    :data-open="open ? '' : undefined"
    :data-side="side"
    :data-expanded="expanded ? '' : undefined"
    :style="[size, attrs.style as CSSProperties]"
    :class="cn(props.placement, 'z-40 flex flex-col overflow-hidden border-border bg-background shadow-floating outline-none', expanded ? 'inset-0' : shape[side], props.class)"
    @keydown="onPanelKey"
  >
    <NqCopilotChat v-if="open" v-bind="chatAttrs" :messages="props.messages" :on-send="props.onSend" :mode="expanded ? 'page' : 'panel'" :on-close="close" class="min-h-0 flex-1">
      <template #header-actions>
        <slot name="header-actions" />
        <NqDropdownMenu v-if="menuSides.length > 1 && !expanded">
          <NqDropdownMenuTrigger as-child>
            <NqButton variant="ghost" size="icon-sm" :aria-label="t.layout" :title="t.layout" data-slot="copilot-dock-layout">
              <component :is="SideIcon" aria-hidden="true" />
            </NqButton>
          </NqDropdownMenuTrigger>
          <NqDropdownMenuContent align="end">
            <NqDropdownMenuLabel>{{ t.layout }}</NqDropdownMenuLabel>
            <NqDropdownMenuRadioGroup :model-value="side" @update:model-value="setSide($event as CopilotDockSide)">
              <NqDropdownMenuRadioItem v-for="s in menuSides" :key="s" :value="s">
                <component :is="iconFor(s)" aria-hidden="true" class="size-4 text-muted-foreground" />
                {{ t[s] }}
              </NqDropdownMenuRadioItem>
            </NqDropdownMenuRadioGroup>
          </NqDropdownMenuContent>
        </NqDropdownMenu>
        <NqButton
          v-if="props.expandable"
          variant="ghost"
          size="icon-sm"
          data-slot="copilot-dock-expand"
          :aria-pressed="expanded"
          :aria-label="expanded ? t.collapse : t.expand"
          :title="expanded ? t.collapse : t.expand"
          @click="setExpanded(!expanded)"
        >
          <Minimize2 v-if="expanded" aria-hidden="true" />
          <Maximize2 v-else aria-hidden="true" />
        </NqButton>
      </template>
    </NqCopilotChat>
  </div>
</template>
