<script setup lang="ts">
import { SquareArrowOutUpRight, Trash2 } from "lucide-vue-next";
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import {
  desktopIconSlot,
  useDesktopIconsLocale,
  type DesktopIconItem,
  type DesktopIconOpenOn,
  type DesktopIconPosition,
  type DesktopIconsLabels,
} from "./desktop-icons-logic";
import NqDesktopIcon from "./NqDesktopIcon.vue";
import NqDesktopIconFree from "./NqDesktopIconFree.vue";

// Desktop icons for a desktop shell (pass it as the shell's default slot) or any wallpaper. Without `@move` they fill an
// auto grid; with it they sit where they were dropped. Arrow keys move between icons, Enter opens one, and a
// context-click opens Open, your actions and Remove (when `@remove` is listened to).
interface Props {
  items: readonly DesktopIconItem[];
  /** Saved positions by item id. Items without one take the next free cell. */
  positions?: Readonly<Record<string, DesktopIconPosition>>;
  /** Ids left off the desktop. */
  hiddenIds?: readonly string[];
  /** Extra context-menu actions, after "Open". */
  actions?: (item: DesktopIconItem) => ContextMenuAction[];
  /** v-model:selected */
  selected?: string | null;
  defaultSelected?: string | null;
  openOn?: DesktopIconOpenOn;
  /** Snap dropped icons to the cell grid. Default true. */
  snap?: boolean;
  labels?: DesktopIconsLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  positions: undefined,
  hiddenIds: undefined,
  actions: undefined,
  selected: undefined,
  defaultSelected: null,
  openOn: "auto",
  snap: true,
  labels: undefined,
});
// open: double-click, Enter, or a tap on touch screens. move: listening to it turns on free placement.
const emit = defineEmits<{ open: [item: DesktopIconItem]; move: [item: DesktopIconItem, position: DesktopIconPosition]; remove: [item: DesktopIconItem]; "update:selected": [id: string | null] }>();
defineOptions({ inheritAttrs: false });
const vnodeProps = getCurrentInstance()?.vnode.props ?? {};
const free = typeof vnodeProps.onMove !== "undefined";
const hasRemove = typeof vnodeProps.onRemove !== "undefined";

const { t, rtl } = useDesktopIconsLocale(() => props.labels);
const inner = ref<string | null>(props.defaultSelected);
const selectedId = computed(() => (props.selected === undefined ? inner.value : props.selected));
function select(id: string | null) {
  if (props.selected === undefined) inner.value = id;
  emit("update:selected", id);
}
const shown = computed(() => {
  const off = new Set(props.hiddenIds ?? []);
  return props.items.filter((item) => !off.has(item.id));
});

const box = ref<HTMLDivElement | null>(null);
const height = ref(600);
let observer: ResizeObserver | undefined;
onMounted(() => {
  const el = box.value;
  if (!el || !free || typeof ResizeObserver === "undefined") return;
  const measure = () => (height.value = el.clientHeight || 600);
  measure();
  observer = new ResizeObserver(measure);
  observer.observe(el);
});
onBeforeUnmount(() => observer?.disconnect());

const menuFor = (item: DesktopIconItem): ContextMenuAction[] => [
  { id: "open", label: t.value.open, icon: SquareArrowOutUpRight, onSelect: () => emit("open", item) },
  ...(props.actions?.(item) ?? []),
  ...(hasRemove ? [{ id: "remove", label: t.value.remove, icon: Trash2, danger: true, group: "end", onSelect: () => emit("remove", item) }] : []),
];

function onKeyDown(event: KeyboardEvent) {
  const keys = rtl.value ? { next: "ArrowLeft", prev: "ArrowRight" } : { next: "ArrowRight", prev: "ArrowLeft" };
  const step = event.key === keys.next || event.key === "ArrowDown" ? 1 : event.key === keys.prev || event.key === "ArrowUp" ? -1 : 0;
  if (event.key === "Escape") return select(null);
  if (!step) return;
  const buttons = Array.from(box.value?.querySelectorAll<HTMLButtonElement>('[data-slot="desktop-icon"]') ?? []);
  const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const next = buttons[Math.min(buttons.length - 1, Math.max(0, at + step))];
  if (!next) return;
  event.preventDefault();
  next.focus();
  const id = next.dataset.id;
  if (id) select(id);
}
</script>

<template>
  <div
    ref="box"
    role="group"
    :aria-label="t.desktopIcons"
    data-slot="desktop-icon-grid"
    :data-free="free ? '' : undefined"
    v-bind="$attrs"
    :class="cn(free ? 'relative size-full' : 'grid auto-rows-max grid-cols-[repeat(auto-fill,6rem)] content-start gap-2 p-2', props.class)"
    @keydown="onKeyDown"
    @pointerdown="$event.target === $event.currentTarget && select(null)"
  >
    <template v-for="(item, index) in shown" :key="item.id">
      <NqDesktopIconFree
        v-if="free"
        :item="item"
        :position="props.positions?.[item.id] ?? desktopIconSlot(index, height)"
        :bounds="box"
        :rtl="rtl"
        :snap="props.snap"
        :selected="selectedId === item.id"
        :open-on="props.openOn"
        :actions="menuFor(item)"
        @open="emit('open', $event)"
        @select="select(item.id)"
        @move="(position) => emit('move', item, position)"
      />
      <NqContextMenuActions v-else :actions="menuFor(item)" class="flex">
        <NqDesktopIcon :item="item" :data-id="item.id" :selected="selectedId === item.id" :open-on="props.openOn" @open="emit('open', $event)" @select="select(item.id)" />
      </NqContextMenuActions>
    </template>
  </div>
</template>
