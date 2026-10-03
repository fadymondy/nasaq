<script setup lang="ts">
import { Maximize2, Minimize2, Minus, X } from "lucide-vue-next";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import type { DesktopWindowState, ResizeHandle } from "./desktop-math";
import type { DesktopApp, STRINGS } from "./strings";

// One window on the desktop. Internal to NqDesktopShell.
const HANDLES: { handle: ResizeHandle; className: string }[] = [
  { handle: "n", className: "inset-x-2 top-0 h-1.5 cursor-ns-resize" },
  { handle: "s", className: "inset-x-2 bottom-0 h-1.5 cursor-ns-resize" },
  { handle: "e", className: "inset-y-2 end-0 w-1.5 cursor-ew-resize" },
  { handle: "w", className: "inset-y-2 start-0 w-1.5 cursor-ew-resize" },
  { handle: "ne", className: "top-0 end-0 size-3 cursor-nesw-resize rtl:cursor-nwse-resize" },
  { handle: "nw", className: "top-0 start-0 size-3 cursor-nwse-resize rtl:cursor-nesw-resize" },
  { handle: "se", className: "bottom-0 end-0 size-3 cursor-nwse-resize rtl:cursor-nesw-resize" },
  { handle: "sw", className: "bottom-0 start-0 size-3 cursor-nesw-resize rtl:cursor-nwse-resize" },
];

const props = defineProps<{ win: DesktopWindowState; app: DesktopApp; focused: boolean; compact: boolean; z: number; t: (typeof STRINGS)["en"] }>();
const emit = defineEmits<{
  focus: [];
  close: [];
  minimise: [];
  toggleMaximise: [];
  dragStart: [event: PointerEvent];
  resizeStart: [event: PointerEvent, handle: ResizeHandle];
}>();
const full = computed(() => props.win.maximised || props.win.snap !== null);
const control = "grid size-6 place-items-center rounded-full text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus";
</script>

<template>
  <section
    data-slot="desktop-window"
    :data-focused="props.focused ? '' : undefined"
    :data-maximised="props.win.maximised ? '' : undefined"
    :aria-label="props.app.title"
    :hidden="props.win.minimised"
    :class="
      cn(
        'absolute flex flex-col overflow-hidden border bg-card text-foreground',
        full ? 'rounded-none border-border' : 'rounded-xl shadow-lg',
        props.focused ? 'border-border shadow-2xl' : 'border-border/60',
      )
    "
    :style="{ insetInlineStart: `${props.win.x}px`, top: `${props.win.y}px`, width: `${props.win.w}px`, height: `${props.win.h}px`, zIndex: props.z }"
    @pointerdown.capture="emit('focus')"
  >
    <div
      data-slot="desktop-window-title"
      :class="cn('flex h-9 shrink-0 select-none items-center gap-2 border-b border-border bg-secondary/60 ps-2 pe-1', !props.compact && 'cursor-default [touch-action:none]')"
      @pointerdown="!props.compact && emit('dragStart', $event)"
      @dblclick="!props.compact && emit('toggleMaximise')"
    >
      <span class="size-5 shrink-0"><component :is="props.app.icon" /></span>
      <span :class="cn('min-w-0 flex-1 truncate text-label', props.focused ? 'text-foreground' : 'text-muted-foreground')">{{ props.app.title }}</span>
      <button type="button" :class="control" :aria-label="props.t.minimise" :title="props.t.minimise" @click="emit('minimise')">
        <Minus aria-hidden="true" class="size-3.5" />
      </button>
      <button v-if="!props.compact" type="button" :class="control" :aria-label="props.win.maximised ? props.t.restore : props.t.maximise" :title="props.win.maximised ? props.t.restore : props.t.maximise" @click="emit('toggleMaximise')">
        <Minimize2 v-if="props.win.maximised" aria-hidden="true" class="size-3.5" />
        <Maximize2 v-else aria-hidden="true" class="size-3.5" />
      </button>
      <button type="button" :class="cn(control, 'hover:bg-nq-danger hover:text-background')" :aria-label="props.t.close" :title="props.t.close" @click="emit('close')">
        <X aria-hidden="true" class="size-3.5" />
      </button>
    </div>
    <div data-slot="desktop-window-body" class="min-h-0 flex-1 overflow-auto"><component :is="props.app.content" /></div>
    <template v-if="!full && !props.compact">
      <div v-for="h in HANDLES" :key="h.handle" aria-hidden="true" :data-handle="h.handle" :class="cn('absolute z-10 [touch-action:none]', h.className)" @pointerdown="emit('resizeStart', $event, h.handle)" />
    </template>
  </section>
</template>
