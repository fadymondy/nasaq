<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import type { TrayPopoverAction } from "./types";

interface Props {
  title: string;
  subtitle?: string;
  /** Where the caret points along the top edge, at the tray icon. `false` hides it. Default `end`. */
  caret?: "start" | "center" | "end" | false;
  /** Footer commands: open the app, settings, quit. */
  actions?: readonly TrayPopoverAction[];
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), { caret: "end", actions: () => [] });
const emit = defineEmits<{ action: [id: string] }>();
defineSlots<{ default?(): unknown; headerEnd?(): unknown }>();

const choose = (action: TrayPopoverAction) => {
  action.onSelect?.();
  emit("action", action.id);
};
</script>

<template>
  <div data-slot="tray-popover" role="group" :aria-label="props.title" :class="cn('relative w-80 max-w-full rounded-xl border border-border bg-card text-foreground shadow-lg', props.class)">
    <span
      v-if="props.caret"
      aria-hidden="true"
      :class="
        cn(
          'absolute -top-1.5 size-3 rotate-45 border-t border-s border-border bg-card',
          props.caret === 'start' && 'start-5',
          props.caret === 'end' && 'end-5',
          props.caret === 'center' && 'start-1/2 -ms-1.5',
        )
      "
    />
    <header class="relative flex items-center gap-3 px-4 pt-3.5 pb-2">
      <div class="min-w-0 flex-1">
        <h2 class="truncate text-label font-semibold">{{ props.title }}</h2>
        <p v-if="props.subtitle" class="truncate text-caption text-muted-foreground">{{ props.subtitle }}</p>
      </div>
      <slot name="headerEnd" />
    </header>
    <div v-if="$slots.default" class="flex flex-col px-1 pb-1"><slot /></div>
    <footer v-if="props.actions.length" class="flex flex-col gap-0.5 border-t border-border p-1">
      <button
        v-for="action in props.actions"
        :key="action.id"
        type="button"
        :class="
          cn(
            'flex h-8 items-center gap-2 rounded-control px-3 text-label outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
            action.danger ? 'text-nq-danger-text' : 'text-foreground',
          )
        "
        @click="choose(action)"
      >
        <component :is="action.icon" v-if="action.icon" aria-hidden="true" class="size-4 text-current opacity-70" />
        <span class="flex-1 text-start">{{ action.label }}</span>
        <kbd v-if="action.shortcut" dir="ltr" class="text-caption text-muted-foreground">{{ action.shortcut }}</kbd>
      </button>
    </footer>
  </div>
</template>
