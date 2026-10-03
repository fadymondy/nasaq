<script setup lang="ts">
import { FileText, Plus, X } from "lucide-vue-next";
import { computed, getCurrentInstance, nextTick, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqIcon } from "../icon";
import { editorTabKeyTarget, type EditorTab } from "./editor-chrome-model";
import { fill, useChromeStrings, type EditorChromeLabels } from "./strings";

// The strip of open documents above an editor. It is a tablist: arrow keys (mirrored in RTL) and Home/End move between
// tabs, Delete or middle-click closes, an unsaved tab shows a dot with a screen-reader label, the active tab scrolls into
// view, and every tab has a context menu. Optional events: close, new, closeOthers, closeAll, pin (each adds its UI).
interface Props {
  tabs: EditorTab[];
  activeId: string | null;
  /** Extra tab actions in the context menu (Shift+F10 too), after the built-in ones. */
  tabActions?: (tab: EditorTab) => ContextMenuAction[];
  labels?: EditorChromeLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { tabActions: undefined, labels: undefined });
const emit = defineEmits<{ select: [id: string]; close: [id: string]; new: []; closeOthers: [id: string]; closeAll: []; pin: [id: string, pinned: boolean] }>();
const vp = getCurrentInstance()?.vnode.props ?? {};
const has = (name: string) => typeof vp[name] !== "undefined";
const canClose = has("onClose");
const canNew = has("onNew");

const { t, direction } = useChromeStrings(() => props.labels);
const list = ref<HTMLDivElement | null>(null);
const ids = computed(() => props.tabs.map((x) => x.id));
const find = (id: string) => list.value?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(id)}"]`);

watch(
  () => [props.activeId, props.tabs.length],
  async () => {
    await nextTick();
    if (props.activeId) find(props.activeId)?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  },
  { flush: "post" },
);

function focusTab(id: string) {
  emit("select", id);
  requestAnimationFrame(() => find(id)?.focus());
}
function onKeyDown(event: KeyboardEvent, tab: EditorTab) {
  if (event.target !== event.currentTarget) return;
  if (event.key === "Delete" && canClose) {
    event.preventDefault();
    emit("close", tab.id);
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    emit("select", tab.id);
    return;
  }
  const target = editorTabKeyTarget(ids.value, tab.id, event.key, direction.value === "rtl" ? "rtl" : "ltr");
  if (target) {
    event.preventDefault();
    focusTab(target);
  }
}
function onAux(event: MouseEvent, tab: EditorTab) {
  if (event.button === 1 && canClose) {
    event.preventDefault();
    emit("close", tab.id);
  }
}
function actionsFor(tab: EditorTab): ContextMenuAction[] {
  return [
    ...(canClose ? [{ id: "close", label: t.value.closeTab, icon: X, onSelect: () => emit("close", tab.id) }] : []),
    ...(has("onCloseOthers") && props.tabs.length > 1 ? [{ id: "others", label: t.value.closeOthers, onSelect: () => emit("closeOthers", tab.id) }] : []),
    ...(has("onCloseAll") ? [{ id: "all", label: t.value.closeAll, onSelect: () => emit("closeAll") }] : []),
    ...(has("onPin") ? [{ id: "pin", label: tab.pinned ? t.value.unpin : t.value.pin, group: "pin", onSelect: () => emit("pin", tab.id, !tab.pinned) }] : []),
    ...(props.tabActions?.(tab).map((a) => ({ ...a, group: a.group ?? "more" })) ?? []),
  ];
}
</script>

<template>
  <div data-slot="editor-tabs" :class="cn('flex items-stretch border-b border-border bg-nq-surface-soft', props.class)">
    <div ref="list" role="tablist" :aria-label="t.openDocuments" class="flex min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:thin]">
      <NqContextMenuActions v-for="tab in props.tabs" :key="tab.id" class="contents" :actions="actionsFor(tab)">
        <div
          role="tab"
          :data-tab-id="tab.id"
          :data-active="tab.id === props.activeId ? '' : undefined"
          :data-dirty="tab.dirty ? '' : undefined"
          :aria-selected="tab.id === props.activeId"
          :tabindex="tab.id === props.activeId ? 0 : -1"
          :title="tab.path ?? (tab.title || t.untitled)"
          :class="
            cn(
              'group/tab relative flex h-row max-w-56 min-w-24 shrink-0 cursor-default items-center gap-1.5 border-e border-border ps-3 pe-1 text-body-sm outline-none transition-colors duration-150 ease-nq',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
              tab.id === props.activeId ? 'bg-background text-foreground' : 'text-muted-foreground hover:bg-nq-hover hover:text-foreground',
            )
          "
          @click="emit('select', tab.id)"
          @keydown="onKeyDown($event, tab)"
          @auxclick="onAux($event, tab)"
        >
          <span v-if="tab.id === props.activeId" aria-hidden="true" class="absolute inset-x-0 top-0 h-0.5 bg-primary" />
          <NqIcon :icon="FileText" class="size-3.5 shrink-0 opacity-70" />
          <span dir="auto" :class="cn('min-w-0 flex-1 truncate text-start', tab.pinned && 'font-medium')">{{ tab.title || t.untitled }}</span>
          <template v-if="tab.dirty">
            <span aria-hidden="true" class="size-2 shrink-0 rounded-full bg-nq-accent" />
            <span class="sr-only">{{ t.unsaved }}</span>
          </template>
          <button
            v-if="canClose && !tab.pinned"
            type="button"
            tabindex="-1"
            :aria-label="fill(t.close, { title: tab.title || t.untitled })"
            class="inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground pointer-coarse:size-7"
            @click.stop="emit('close', tab.id)"
          >
            <NqIcon :icon="X" class="size-3" />
          </button>
        </div>
      </NqContextMenuActions>
    </div>
    <NqButton v-if="canNew" variant="ghost" size="icon-sm" :aria-label="t.newTab" class="m-1 shrink-0" @click="emit('new')">
      <NqIcon :icon="Plus" />
    </NqButton>
  </div>
</template>
