<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import {
  clampRect,
  closeWindow,
  focusedWindow,
  focusWindow,
  minimiseWindow,
  openWindow,
  patchWindow,
  resizeRect,
  snapRect,
  snapWindow,
  snapZone,
  toggleMaximise,
  unsnapForDrag,
  windowsOf,
  type DesktopBounds,
  type DesktopSnap,
  type DesktopWindowState,
  type ResizeHandle,
} from "./desktop-math";
import { useDesktopStrings, type DesktopApp, type DesktopMenu, type DesktopShellApi, type DesktopShellLabels } from "./strings";
import NqDesktopDock from "./NqDesktopDock.vue";
import NqDesktopLaunchpad from "./NqDesktopLaunchpad.vue";
import NqDesktopMenuBar from "./NqDesktopMenuBar.vue";
import NqDesktopWindowFrame from "./NqDesktopWindowFrame.vue";

// A desktop for the browser: wallpaper, a menu bar, a dock, a launchpad and a window manager (drag, resize, snap to
// the inline edges, maximise, minimise). Apps are plain components and the window list is plain data, controlled
// (`windows` + `@update:windows`) or not. On a narrow container the windows go full size and only the top one shows.
// Slots: default (desktop content behind the windows; slot prop `open`), `wallpaper`, `menu-bar-start`, `menu-bar-end`.
interface Props {
  apps: readonly DesktopApp[];
  /** Controlled window list, back to front. Leave out for an uncontrolled desktop. */
  windows?: readonly DesktopWindowState[];
  defaultWindows?: readonly DesktopWindowState[];
  /** Menus after the app name. A function gets the app that has focus. */
  menus?: readonly DesktopMenu[] | ((focused: DesktopApp | undefined) => readonly DesktopMenu[]);
  launchpadOpen?: boolean;
  /** Container width under which windows go full size and the dock replaces dragging. Default 640. */
  compactBelow?: number;
  labels?: DesktopShellLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { windows: undefined, defaultWindows: () => [], menus: undefined, launchpadOpen: undefined, compactBelow: 640, labels: undefined });
const emit = defineEmits<{ "update:windows": [windows: DesktopWindowState[]]; "update:launchpadOpen": [open: boolean] }>();
defineSlots<{ default?: (api: DesktopShellApi) => unknown; wallpaper?: () => unknown; "menu-bar-start"?: () => unknown; "menu-bar-end"?: () => unknown }>();

const { t, rtl } = useDesktopStrings(() => props.labels);
const inner = shallowRef<readonly DesktopWindowState[]>(props.defaultWindows);
const windows = computed(() => props.windows ?? inner.value);
let latest: readonly DesktopWindowState[] = windows.value;
watch(windows, (w) => (latest = w));
function setWindows(next: DesktopWindowState[]) {
  latest = next;
  if (props.windows === undefined) inner.value = next;
  emit("update:windows", next);
}
const launchInner = ref(false);
const launchpadOpen = computed(() => props.launchpadOpen ?? launchInner.value);
function setLaunchpad(open: boolean) {
  if (props.launchpadOpen === undefined) launchInner.value = open;
  emit("update:launchpadOpen", open);
}

const DOCK_SPACE = 76;
const area = ref<HTMLDivElement | null>(null);
const size = ref({ w: 1000, h: 640 });
let observer: ResizeObserver | undefined;
onMounted(() => {
  const el = area.value;
  if (!el || typeof ResizeObserver === "undefined") return;
  const measure = () => (size.value = { w: el.clientWidth, h: el.clientHeight });
  measure();
  observer = new ResizeObserver(measure);
  observer.observe(el);
});
const compact = computed(() => size.value.w < props.compactBelow);
const bounds = computed<DesktopBounds>(() => ({ w: size.value.w, h: Math.max(200, size.value.h - (compact.value ? 0 : DOCK_SPACE)) }));

const appOf = (id: string) => props.apps.find((a) => a.id === id);
const top = computed(() => focusedWindow(windows.value));
const focusedApp = computed(() => (top.value ? appOf(top.value.appId) : undefined));
const menuList = computed(() => (typeof props.menus === "function" ? props.menus(focusedApp.value) : (props.menus ?? [])));

function open(app: DesktopApp) {
  setWindows(openWindow(latest, bounds.value, { appId: app.id, size: app.size, single: app.single, compact: compact.value }));
}
function activate(app: DesktopApp) {
  setLaunchpad(false);
  const own = windowsOf(latest, app.id);
  const last = own[own.length - 1];
  if (!last) return open(app);
  if (top.value && top.value.id === last.id) setWindows(minimiseWindow(latest, last.id));
  else setWindows(focusWindow(latest, last.id));
}
function openById(appId: string) {
  const app = appOf(appId);
  if (!app) return;
  setLaunchpad(false);
  const last = windowsOf(latest, app.id).at(-1);
  if (last) setWindows(focusWindow(latest, last.id));
  else open(app);
}
function newWindow(app: DesktopApp) {
  setLaunchpad(false);
  open(app);
}
const api: DesktopShellApi = { open: openById };

// A narrow container shows only the top window: the others stay in the list, just out of sight.
const visibleTop = computed(() => (compact.value ? top.value?.id : undefined));

type Gesture =
  | { kind: "move"; id: string; startX: number; startY: number; base: DesktopWindowState; grab: number }
  | { kind: "resize"; id: string; handle: ResizeHandle; startX: number; startY: number; base: DesktopWindowState };
const preview = ref<DesktopSnap | null>(null);
let gesture: Gesture | null = null;

function areaPoint(event: { clientX: number; clientY: number }) {
  const rect = area.value?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  return { x: rtl.value ? rect.right - event.clientX : event.clientX - rect.left, y: event.clientY - rect.top };
}
function beginMove(event: PointerEvent, win: DesktopWindowState) {
  if ((event.target as HTMLElement).closest("button")) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const p = areaPoint(event);
  gesture = { kind: "move", id: win.id, startX: p.x, startY: p.y, base: win, grab: win.w ? (p.x - win.x) / win.w : 0.5 };
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  attach();
}
function beginResize(event: PointerEvent, win: DesktopWindowState, handle: ResizeHandle) {
  const p = areaPoint(event);
  gesture = { kind: "resize", id: win.id, handle, startX: p.x, startY: p.y, base: win };
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  event.preventDefault();
  attach();
}
function onMove(event: PointerEvent) {
  const g = gesture;
  if (!g) return;
  const p = areaPoint(event);
  const dx = p.x - g.startX;
  const dy = p.y - g.startY;
  if (g.kind === "resize") {
    setWindows(patchWindow(latest, g.id, resizeRect(g.base, g.handle, dx, dy)));
    return;
  }
  const base = g.base;
  if ((base.maximised || base.snap) && Math.abs(dx) + Math.abs(dy) > 4) {
    const restored = unsnapForDrag(base, p.x, p.y, g.grab, bounds.value);
    g.base = restored;
    g.startX = p.x;
    g.startY = p.y;
    setWindows(latest.map((w) => (w.id === g.id ? restored : w)));
    return;
  }
  if (base.maximised || base.snap) return;
  setWindows(patchWindow(latest, g.id, clampRect({ x: base.x + dx, y: base.y + dy, w: base.w, h: base.h }, bounds.value)));
  preview.value = snapZone(p, bounds.value);
}
function onUp(event: PointerEvent) {
  const g = gesture;
  gesture = null;
  detach();
  if (!g) return;
  preview.value = null;
  if (g.kind === "move") {
    const zone = snapZone(areaPoint(event), bounds.value);
    if (zone) setWindows(snapWindow(latest, g.id, zone, bounds.value));
  }
}
function attach() {
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}
function detach() {
  window.removeEventListener("pointermove", onMove);
  window.removeEventListener("pointerup", onUp);
  window.removeEventListener("pointercancel", onUp);
}
onBeforeUnmount(() => {
  detach();
  observer?.disconnect();
});

// When the container shrinks, a floating window is pulled back inside it.
watch(
  () => [bounds.value.w, bounds.value.h],
  () => {
    let changed = false;
    const b = bounds.value;
    const next = latest.map((w) => {
      if (w.maximised || w.snap) {
        const r = w.snap ? snapRect(w.snap, b) : snapRect("top", b);
        if (r.w !== w.w || r.h !== w.h || r.x !== w.x) {
          changed = true;
          return { ...w, ...r };
        }
        return w;
      }
      const c = clampRect(w, b);
      if (c.x !== w.x || c.y !== w.y) {
        changed = true;
        return { ...w, ...c };
      }
      return w;
    });
    if (changed) setWindows(next);
  },
);

const previewRect = computed(() => (preview.value ? snapRect(preview.value, bounds.value) : null));
function shownOf(win: DesktopWindowState): DesktopWindowState {
  const base = compact.value ? { ...win, x: 0, y: 0, w: size.value.w, h: size.value.h, maximised: true } : win;
  return visibleTop.value !== undefined && visibleTop.value !== win.id ? { ...base, minimised: true } : base;
}
</script>

<template>
  <div
    data-slot="desktop-shell"
    :data-compact="compact ? '' : undefined"
    :class="cn('relative isolate flex h-full min-h-96 w-full flex-col overflow-hidden bg-background text-foreground', props.class)"
  >
    <div aria-hidden="true" class="absolute inset-0 -z-10">
      <slot name="wallpaper">
        <div class="size-full bg-[radial-gradient(120%_90%_at_20%_0%,color-mix(in_oklab,var(--nq-action)_28%,transparent),transparent_60%),radial-gradient(90%_80%_at_100%_100%,color-mix(in_oklab,var(--nq-success)_22%,transparent),transparent_60%)]" />
      </slot>
    </div>
    <NqDesktopMenuBar :app-name="focusedApp?.title" :menus="menuList" :labels="props.labels">
      <template #start><slot name="menu-bar-start" /></template>
      <template #end><slot name="menu-bar-end" /></template>
    </NqDesktopMenuBar>
    <div ref="area" role="region" :aria-label="t.desktop" class="relative min-h-0 flex-1">
      <div v-if="$slots.default" class="absolute inset-0"><slot v-bind="api" /></div>
      <div
        v-if="previewRect"
        data-slot="desktop-snap-preview"
        aria-hidden="true"
        class="pointer-events-none absolute rounded-xl border-2 border-primary/60 bg-primary/10"
        :style="{ insetInlineStart: `${previewRect.x + 6}px`, top: `${previewRect.y + 6}px`, width: `${previewRect.w - 12}px`, height: `${previewRect.h - 12}px`, zIndex: 800 }"
      />
      <template v-for="(win, index) in windows" :key="win.id">
        <NqDesktopWindowFrame
          v-if="appOf(win.appId)"
          :win="shownOf(win)"
          :app="appOf(win.appId)!"
          :focused="top?.id === win.id"
          :compact="compact"
          :z="10 + index"
          :t="t"
          @focus="setWindows(focusWindow(latest, win.id))"
          @close="setWindows(closeWindow(latest, win.id))"
          @minimise="setWindows(minimiseWindow(latest, win.id))"
          @toggle-maximise="setWindows(toggleMaximise(latest, win.id, bounds))"
          @drag-start="beginMove($event, win)"
          @resize-start="(event, handle) => beginResize(event, win, handle)"
        />
      </template>
      <div class="pointer-events-none absolute inset-x-0 bottom-2 z-[850] flex justify-center px-2">
        <NqDesktopDock
          class="pointer-events-auto max-w-full overflow-x-auto"
          :apps="props.apps"
          :windows="windows"
          :launchpad-open="launchpadOpen"
          :labels="props.labels"
          @activate="activate"
          @new-window="newWindow"
          @close-all="(app) => setWindows(latest.filter((w) => w.appId !== app.id))"
          @launchpad="setLaunchpad(!launchpadOpen)"
        />
      </div>
      <NqDesktopLaunchpad v-if="launchpadOpen" :apps="props.apps" :labels="props.labels" @select="activate" @close="setLaunchpad(false)" />
    </div>
  </div>
</template>
