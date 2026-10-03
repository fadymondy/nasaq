<script setup lang="ts">
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from "reka-ui";
import { computed, onBeforeUnmount, onMounted, provide, ref, useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { presence } from "../../lib/presence";
import { useT } from "../../provider";
import { provideCommands, useRegisteredCommands } from "../commands";
import { isApplePlatform } from "../commands/commands";
import {
  DESKTOP_QUERY,
  KEY_STEP,
  readStorage,
  SHELL_KEY,
  SIDEBAR_STORAGE_KEY,
  SIDEBAR_WIDTH_KEY,
  SNAP_TO_RAIL,
  writeStorage,
} from "./context";
import NqSidebarRail from "./NqSidebarRail.vue";

/**
 * The shell every product re-solved: a sidebar at the inline start, a header, and the page.
 * ⌘B / Ctrl+B toggles the rail. Below md the sidebar moves into a sheet opened from the header.
 * Put the sidebar in the `sidebar` slot (a `NqSidebar`); leave it out for top navigation.
 */
interface Props {
  /**
   * `plain` (default): the page fills the space beside the sidebar.
   * `inset`: the page sits on its own rounded panel, inset from the sidebar's surface (md+).
   */
  variant?: "plain" | "inset";
  defaultCollapsed?: boolean;
  /** Controlled rail state (v-model:collapsed). When set, nothing is persisted. */
  collapsed?: boolean;
  /** Lets the user drag the sidebar edge to resize it (desktop). Default true. */
  resizable?: boolean;
  /** Sidebar width in px. Default 256; the user's width is remembered. */
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /** Accessible name of the resize handle; localise it. */
  resizeLabel?: string;
  /**
   * Height taken from above the shell, such as an Electron title bar: a number is px, a string any CSS length. It
   * sets `--nasaq-shell-offset`, which the shell subtracts from its `100dvh` (and the sidebar sticks below). Set the
   * variable yourself in CSS to get the same result. Default 0.
   */
  offset?: number | string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  variant: "plain",
  defaultCollapsed: false,
  collapsed: undefined,
  resizable: true,
  defaultWidth: 256,
  minWidth: 208,
  maxWidth: 420,
  resizeLabel: undefined,
  offset: undefined,
});
const emits = defineEmits<{ "update:collapsed": [value: boolean] }>();
const slots = useSlots();
const t = useT();

const storedCollapsed = ref(props.defaultCollapsed);
const collapsed = computed(() => props.collapsed ?? storedCollapsed.value);
const mobileOpen = ref(false);

// The palette's open state lives in the command registry, so a search trigger and the palette share it with or
// without the shell. An outer provider's registry is reused.
const registry = provideCommands();
const snapshot = useRegisteredCommands(registry);
const commandOpen = computed(() => snapshot.value.paletteOpen);

function setCollapsed(next: boolean) {
  if (props.collapsed === undefined) {
    storedCollapsed.value = next;
    writeStorage(SIDEBAR_STORAGE_KEY, next ? "collapsed" : "expanded");
  }
  emits("update:collapsed", next);
}

function toggleSidebar() {
  if (!slots.sidebar) return;
  if (typeof window.matchMedia !== "function" || window.matchMedia(DESKTOP_QUERY).matches) setCollapsed(!collapsed.value);
  else mobileOpen.value = !mobileOpen.value;
}

provide(SHELL_KEY, {
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen: (open) => (mobileOpen.value = open),
  toggleSidebar,
  commandOpen,
  setCommandOpen: registry.setPaletteOpen,
});

const width = ref(props.defaultWidth);
const resizing = ref(false);
const clamp = (w: number) => Math.round(Math.min(props.maxWidth, Math.max(props.minWidth, w)));

// ⌘B / Ctrl+B. Matched on event.code so it keeps working on Arabic keyboard layouts; text fields keep their own ⌘B.
function onHotkey(event: KeyboardEvent) {
  const mod = isApplePlatform() ? event.metaKey : event.ctrlKey;
  if (!mod || event.altKey || event.shiftKey) return;
  if (event.code !== "KeyB" && event.key.toLowerCase() !== "b") return;
  const target = event.target;
  if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
  event.preventDefault();
  toggleSidebar();
}

onMounted(() => {
  if (props.collapsed === undefined) {
    const saved = readStorage(SIDEBAR_STORAGE_KEY);
    if (saved === "collapsed" || saved === "expanded") storedCollapsed.value = saved === "collapsed";
  }
  const savedWidth = Number(readStorage(SIDEBAR_WIDTH_KEY));
  if (savedWidth) width.value = clamp(savedWidth);
  window.addEventListener("keydown", onHotkey);
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onHotkey);
  document.documentElement.style.cursor = "";
});

function commitWidth(w: number) {
  const next = clamp(w);
  width.value = next;
  writeStorage(SIDEBAR_WIDTH_KEY, String(next));
}

function onResizeStart(event: PointerEvent) {
  if (event.button !== 0) return;
  event.preventDefault();
  const handle = event.currentTarget as HTMLElement;
  const rtl = getComputedStyle(handle).direction === "rtl";
  const startX = event.clientX;
  const startWidth = collapsed.value ? props.minWidth - SNAP_TO_RAIL : width.value;
  let current = width.value;
  let rail = collapsed.value;
  resizing.value = true;
  document.documentElement.style.cursor = "col-resize";

  const onMove = (e: PointerEvent) => {
    const raw = startWidth + (rtl ? startX - e.clientX : e.clientX - startX);
    const toRail = raw < props.minWidth - SNAP_TO_RAIL / 2;
    if (toRail !== rail) {
      rail = toRail;
      setCollapsed(toRail);
    }
    if (!toRail) {
      current = clamp(raw);
      width.value = current;
    }
  };
  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    document.documentElement.style.cursor = "";
    resizing.value = false;
    if (!rail) commitWidth(current);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

function onResizeKey(event: KeyboardEvent) {
  const rtl = getComputedStyle(event.currentTarget as HTMLElement).direction === "rtl";
  const grow = rtl ? "ArrowLeft" : "ArrowRight";
  const shrink = rtl ? "ArrowRight" : "ArrowLeft";
  const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP;
  let next: number | null = null;
  if (event.key === grow) next = collapsed.value ? props.minWidth : width.value + step;
  else if (event.key === shrink) {
    if (collapsed.value) return;
    if (width.value <= props.minWidth) {
      event.preventDefault();
      setCollapsed(true);
      return;
    }
    next = width.value - step;
  } else if (event.key === "Home") next = props.minWidth;
  else if (event.key === "End") next = props.maxWidth;
  else if (event.key === "Enter") next = props.defaultWidth;
  if (next === null) return;
  event.preventDefault();
  if (collapsed.value) setCollapsed(false);
  commitWidth(next);
}

function onResizeReset() {
  if (collapsed.value) setCollapsed(false);
  commitWidth(props.defaultWidth);
}

const inset = computed(() => props.variant === "inset");
const shellStyle = computed(() =>
  props.offset === undefined ? undefined : { "--nasaq-shell-offset": typeof props.offset === "number" ? `${props.offset}px` : props.offset },
);
</script>

<template>
  <div
    data-slot="app-shell"
    :data-variant="props.variant"
    :data-navigation="slots.sidebar ? 'sidebar' : 'top'"
    :style="shellStyle"
    :class="
      cn(
        'flex min-h-[calc(100dvh_-_var(--nasaq-shell-offset,0px))] bg-background text-foreground',
        'has-data-[slot=app-nav-bar]:max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]',
        inset && 'md:bg-sidebar',
        props.class,
      )
    "
  >
    <a
      href="#app-main"
      class="sr-only rounded-control border border-border bg-popover text-label text-foreground shadow-md focus:not-sr-only focus:fixed focus:start-3 focus:top-2 focus:z-50 focus:px-3 focus:py-2 focus-visible:outline-2 focus-visible:outline-nq-focus"
    >
      {{ t("Skip to content", "تخطَّ إلى المحتوى") }}
    </a>
    <aside
      v-if="slots.sidebar"
      data-slot="app-sidebar"
      :data-collapsed="collapsed ? '' : undefined"
      :data-resizing="resizing ? '' : undefined"
      :style="{ '--nq-sidebar-width': `${width}px` }"
      :class="
        cn(
          'sticky top-[var(--nasaq-shell-offset,0px)] hidden h-[calc(100dvh_-_var(--nasaq-shell-offset,0px))] shrink-0 border-e border-border bg-sidebar transition-[width] duration-200 ease-nq md:block',
          inset && 'md:border-e-0',
          'data-resizing:transition-none',
          collapsed ? 'w-[calc(var(--nq-control)+2*var(--nq-shell-pad))]' : 'w-(--nq-sidebar-width)',
        )
      "
    >
      <div class="h-full overflow-hidden">
        <NqSidebarRail :collapsed="collapsed"><slot name="sidebar" /></NqSidebarRail>
      </div>
      <div
        v-if="props.resizable"
        role="separator"
        aria-orientation="vertical"
        :aria-label="props.resizeLabel ?? t('Resize sidebar', 'تغيير عرض الشريط الجانبي')"
        :aria-valuemin="props.minWidth"
        :aria-valuemax="props.maxWidth"
        :aria-valuenow="width"
        :aria-hidden="collapsed || undefined"
        :tabindex="collapsed ? -1 : 0"
        data-slot="sidebar-resize-handle"
        :class="
          cn(
            // A 9px hit area centred on the border; the visible 2px line appears on hover, focus or drag.
            'absolute inset-y-0 -end-[5px] z-20 w-[9px] cursor-col-resize touch-none outline-none',
            'after:absolute after:inset-y-0 after:start-1 after:w-0.5 after:bg-transparent after:transition-colors after:duration-150',
            'hover:after:bg-nq-line-strong focus-visible:after:bg-nq-focus',
            resizing && 'after:bg-nq-accent!',
          )
        "
        @pointerdown="onResizeStart"
        @keydown="onResizeKey"
        @dblclick="onResizeReset"
      />
    </aside>
    <DialogRoot v-if="slots.sidebar" v-model:open="mobileOpen">
      <DialogPortal>
        <Transition v-bind="presence">
          <DialogOverlay
            v-if="mobileOpen"
            force-mount
            class="fixed inset-0 z-40 bg-nq-fg/15 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 md:hidden dark:bg-nq-bg/70"
          />
        </Transition>
        <Transition v-bind="presence">
          <DialogContent
            v-if="mobileOpen"
            force-mount
            data-slot="app-shell-sheet"
            aria-describedby=""
            class="fixed inset-y-0 start-0 z-50 w-[min(18rem,85vw)] border-e border-border bg-sidebar outline-none transition-[translate,opacity] duration-200 ease-nq data-ending-style:-translate-x-8 data-ending-style:opacity-0 data-starting-style:-translate-x-8 data-starting-style:opacity-0 rtl:data-ending-style:translate-x-8 rtl:data-starting-style:translate-x-8 md:hidden"
          >
            <DialogTitle class="sr-only">{{ t("Navigation", "التنقل") }}</DialogTitle>
            <!-- No close button: it would sit on the workspace switcher. Backdrop tap and Esc close it. -->
            <NqSidebarRail :collapsed="false"><slot name="sidebar" /></NqSidebarRail>
          </DialogContent>
        </Transition>
      </DialogPortal>
    </DialogRoot>
    <!-- The panel scrolls by itself, so the sticky header stays inside its rounded corners. -->
    <div v-if="inset" data-slot="app-shell-panel-frame" class="flex min-w-0 flex-1 flex-col md:h-[calc(100dvh_-_var(--nasaq-shell-offset,0px))] md:py-2 md:pe-2">
      <div
        data-slot="app-shell-panel"
        class="flex min-w-0 flex-1 flex-col bg-background md:overflow-y-auto md:rounded-xl md:border md:border-border md:shadow-xs"
      >
        <slot />
      </div>
    </div>
    <div v-else class="flex min-w-0 flex-1 flex-col"><slot /></div>
  </div>
</template>
