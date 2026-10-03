<script setup lang="ts">
import { LayoutGrid } from "lucide-vue-next";
import { computed, getCurrentInstance, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { focusedWindow, windowsOf, type DesktopWindowState } from "./desktop-math";
import { useDesktopStrings, type DesktopApp, type DesktopShellLabels } from "./strings";

// Pinned and running apps as a floating pill. A dot marks running apps; context-click for window actions.
// Events: activate, newWindow, closeAll, launchpad. The launchpad button shows when `@launchpad` is listened to.
interface Props {
  apps: readonly DesktopApp[];
  windows: readonly DesktopWindowState[];
  launchpadOpen?: boolean;
  labels?: DesktopShellLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { launchpadOpen: false, labels: undefined });
const emit = defineEmits<{ activate: [app: DesktopApp]; newWindow: [app: DesktopApp]; closeAll: [app: DesktopApp]; launchpad: [] }>();
const vp = getCurrentInstance()?.vnode.props ?? {};
const hasLaunchpad = typeof vp.onLaunchpad !== "undefined";
const hasCloseAll = typeof vp.onCloseAll !== "undefined";
const { t } = useDesktopStrings(() => props.labels);

const items = computed(() => props.apps.filter((a) => a.pinned !== false || windowsOf(props.windows, a.id).length > 0));
const focus = computed(() => focusedWindow(props.windows));

function actionsOf(app: DesktopApp, running: boolean): ContextMenuAction[] {
  return [
    { id: "open", label: running ? t.value.newWindow : t.value.open, onSelect: () => (running ? emit("newWindow", app) : emit("activate", app)) },
    ...(running && hasCloseAll ? [{ id: "close-all", label: t.value.closeAll, danger: true, group: "end", onSelect: () => emit("closeAll", app) }] : []),
  ];
}
</script>

<template>
  <nav
    data-slot="desktop-dock"
    :aria-label="t.dock"
    :class="cn('flex items-end gap-1.5 rounded-2xl border border-border/70 bg-card/80 p-1.5 shadow-lg backdrop-blur-md', props.class)"
  >
    <template v-if="hasLaunchpad">
      <button
        type="button"
        :aria-label="t.launchpad"
        :title="t.launchpad"
        :aria-pressed="props.launchpadOpen"
        class="grid size-11 place-items-center rounded-xl bg-secondary text-foreground outline-none transition-transform duration-150 ease-nq hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-nq-focus"
        @click="emit('launchpad')"
      >
        <LayoutGrid aria-hidden="true" class="size-5" />
      </button>
      <span aria-hidden="true" class="mx-0.5 h-8 w-px self-center bg-border" />
    </template>
    <NqContextMenuActions v-for="app in items" :key="app.id" as="div" class="contents" :actions="actionsOf(app, windowsOf(props.windows, app.id).length > 0)">
      <button
        type="button"
        :aria-label="app.title"
        :title="app.title"
        :data-running="windowsOf(props.windows, app.id).length > 0 ? '' : undefined"
        :data-focused="focus && focus.appId === app.id ? '' : undefined"
        class="group relative flex size-11 flex-col items-center rounded-xl outline-none transition-transform duration-150 ease-nq hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nq-focus"
        @click="emit('activate', app)"
      >
        <span class="size-11"><component :is="app.icon" /></span>
        <template v-if="windowsOf(props.windows, app.id).length > 0">
          <span aria-hidden="true" class="absolute -bottom-1 size-1 rounded-full bg-foreground" />
          <span class="sr-only">{{ t.running }}</span>
        </template>
      </button>
    </NqContextMenuActions>
  </nav>
</template>
