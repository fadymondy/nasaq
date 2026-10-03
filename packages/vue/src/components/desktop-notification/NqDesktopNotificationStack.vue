<script lang="ts">
import type { DesktopNotificationAction } from "./permission";

/** One card in the stack: the notification's own fields plus an id. */
export interface DesktopNotificationEntry {
  id: string;
  appName: string;
  title?: string;
  body?: string;
  time?: number | Date | string;
  actions?: readonly DesktopNotificationAction[];
  dismissAfter?: number;
}
</script>

<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqDesktopNotification from "./NqDesktopNotification.vue";
import NqStackEntry from "./NqStackEntry.vue";
import type { DesktopPlatform } from "./permission";
import type { DesktopNotificationLabels } from "./strings";
import { useDesktopNotificationLabels } from "./use-labels";

// Where the cards land: the top corner on macOS and the bottom corner on Windows, on the inline-end side (the
// left in Arabic). Newest first on macOS, newest last on Windows, like the systems do.
export interface Props {
  items: readonly DesktopNotificationEntry[];
  platform?: DesktopPlatform;
  onClose: (id: string) => void;
  onAction?: (id: string, action: string) => void;
  onActivate?: (id: string) => void;
  /** Most cards shown at once. Older ones wait. Default 3. */
  max?: number;
  /** `absolute` places the stack inside a `relative` parent, `fixed` on the screen. Default `absolute`. */
  placement?: "absolute" | "fixed";
  labels?: Partial<DesktopNotificationLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { platform: "macos", onAction: undefined, onActivate: undefined, max: 3, placement: "absolute", labels: undefined });
const t = useDesktopNotificationLabels(() => props.labels);
const mac = computed(() => props.platform === "macos");
const ordered = computed(() => {
  const shown = props.items.slice(-props.max);
  return mac.value ? [...shown].reverse() : shown;
});
</script>

<template>
  <div
    role="region"
    :aria-label="t.stack"
    data-slot="desktop-notification-stack"
    :class="cn('pointer-events-none z-50 flex w-[22rem] max-w-[calc(100%-1.5rem)] flex-col gap-2 p-3', placement, mac ? 'end-0 top-0' : 'bottom-0 end-0 justify-end', props.class)"
  >
    <NqStackEntry v-for="entry in ordered" :key="entry.id" :platform="platform">
      <NqDesktopNotification
        :app-name="entry.appName"
        :title="entry.title"
        :body="entry.body"
        :time="entry.time"
        :actions="entry.actions"
        :dismiss-after="entry.dismissAfter"
        :platform="platform"
        :labels="labels"
        class="pointer-events-auto w-full"
        :on-close="() => onClose(entry.id)"
        :on-action="(a: string) => onAction?.(entry.id, a)"
        :on-activate="onActivate ? () => onActivate!(entry.id) : undefined"
      />
    </NqStackEntry>
  </div>
</template>
