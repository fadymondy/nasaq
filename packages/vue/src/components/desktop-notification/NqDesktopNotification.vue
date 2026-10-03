<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watchEffect, type HTMLAttributes } from "vue";
import { MoreHorizontal, X } from "lucide-vue-next";
import { cn } from "../../lib/cn";
import NqButton from "../button/NqButton.vue";
import NqDateTime from "../numeric/NqDateTime.vue";
import type { DesktopNotificationAction, DesktopPlatform } from "./permission";
import type { DesktopNotificationLabels } from "./strings";
import { useDesktopNotificationLabels } from "./use-labels";

// A notification card drawn in the style of the system's own, for apps that run inside Electron and want the same
// card in a web preview, a settings screen or a tutorial. It does not talk to the operating system: to raise a real
// one use `new Notification()` or your Electron main process, and use this to show what it will look like.
// Slots: appIcon (replaces the first-letter tile), title, body, image.
interface Props {
  /** Which system's look to draw. Default `macos`. */
  platform?: DesktopPlatform;
  /** The app that sent it, shown small above the title. */
  appName: string;
  title?: string;
  body?: string;
  /** When it arrived. Omit to show "now". */
  time?: number | Date | string;
  /** Buttons on the card. */
  actions?: readonly DesktopNotificationAction[];
  onAction?: (id: string) => void;
  /** The card body was clicked. */
  onActivate?: () => void;
  /** The close button was pressed, or `dismissAfter` ran out. */
  onClose?: () => void;
  /** Milliseconds before it closes itself. Hovering or focusing it pauses the clock. 0 keeps it. Default 0. */
  dismissAfter?: number;
  labels?: Partial<DesktopNotificationLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  platform: "macos",
  title: undefined,
  body: undefined,
  time: undefined,
  actions: undefined,
  onAction: undefined,
  onActivate: undefined,
  onClose: undefined,
  dismissAfter: 0,
  labels: undefined,
});
const t = useDesktopNotificationLabels(() => props.labels);
const mac = computed(() => props.platform === "macos");
const paused = ref(false);

let timer: ReturnType<typeof setTimeout> | undefined;
watchEffect((onCleanup) => {
  if (!props.dismissAfter || paused.value) return;
  timer = setTimeout(() => props.onClose?.(), props.dismissAfter);
  onCleanup(() => clearTimeout(timer));
});
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div
    role="alert"
    data-slot="desktop-notification"
    :data-platform="platform"
    :class="
      cn(
        'group/dn relative flex w-[22rem] max-w-full gap-2 border border-border text-foreground shadow-floating',
        'flex-col p-3',
        mac ? 'rounded-[1.1rem] bg-popover/90 backdrop-blur-xl' : 'rounded-card bg-card',
        props.class,
      )
    "
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @focusin="paused = true"
    @focusout="paused = false"
  >
    <div :class="cn('flex min-w-0 flex-1 gap-3', !mac && 'items-start')">
      <span :class="cn('shrink-0 self-start', mac ? 'size-10' : 'size-6')">
        <slot name="appIcon">
          <span aria-hidden="true" :class="cn('grid size-full place-items-center bg-primary text-label text-primary-foreground', mac ? 'rounded-[22%]' : 'rounded-control')">{{ appName.slice(0, 1).toUpperCase() }}</span>
        </slot>
      </span>
      <button
        type="button"
        :disabled="!onActivate"
        :class="cn('flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-control text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus', onActivate ? 'cursor-default' : 'cursor-default disabled:opacity-100')"
        @click="onActivate?.()"
      >
        <template v-if="mac">
          <span dir="auto" class="w-full truncate text-label"><slot name="title">{{ title }}</slot></span>
          <span v-if="body || $slots.body" dir="auto" class="line-clamp-3 w-full text-body-sm text-nq-fg-body"><slot name="body">{{ body }}</slot></span>
        </template>
        <template v-else>
          <span class="flex w-full items-center gap-2 text-caption text-muted-foreground"><span class="truncate">{{ appName }}</span></span>
          <span dir="auto" class="w-full truncate text-label"><slot name="title">{{ title }}</slot></span>
          <span v-if="body || $slots.body" dir="auto" class="line-clamp-3 w-full text-body-sm text-nq-fg-body"><slot name="body">{{ body }}</slot></span>
        </template>
      </button>
      <span v-if="mac" class="flex shrink-0 flex-col items-end gap-1 text-caption text-muted-foreground">
        <span><template v-if="time === undefined">{{ t.now }}</template><NqDateTime v-else :value="time" :format="{ timeStyle: 'short' }" /></span>
        <span v-if="$slots.image" class="size-10 overflow-hidden rounded-control"><slot name="image" /></span>
      </span>
      <span v-else class="flex shrink-0 items-center gap-0.5 text-muted-foreground">
        <span class="me-1 text-caption"><template v-if="time === undefined">{{ t.now }}</template><NqDateTime v-else :value="time" :format="{ timeStyle: 'short' }" /></span>
        <NqButton variant="ghost" size="icon-sm" :aria-label="t.options" tabindex="-1"><MoreHorizontal aria-hidden="true" class="size-4" /></NqButton>
        <NqButton variant="ghost" size="icon-sm" :aria-label="t.close" @click="onClose?.()"><X aria-hidden="true" class="size-4" /></NqButton>
      </span>
    </div>
    <div v-if="!mac && $slots.image" class="overflow-hidden rounded-control"><slot name="image" /></div>
    <div v-if="actions?.length" :class="cn('flex gap-2', mac && 'ps-[3.25rem]')" role="group" :aria-label="appName">
      <NqButton v-for="a in actions" :key="a.id" variant="secondary" size="sm" :class="mac ? '' : 'flex-1'" @click="onAction?.(a.id)">{{ a.label }}</NqButton>
    </div>
    <NqButton
      v-if="mac"
      variant="secondary"
      size="icon-sm"
      :aria-label="t.close"
      class="absolute -start-2 -top-2 size-5 rounded-full opacity-0 transition-opacity duration-150 ease-nq focus-visible:opacity-100 group-hover/dn:opacity-100"
      @click="onClose?.()"
    >
      <X aria-hidden="true" class="size-3" />
    </NqButton>
  </div>
</template>
