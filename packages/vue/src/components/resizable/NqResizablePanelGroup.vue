<script setup lang="ts">
import { ConfigProvider, SplitterGroup } from "reka-ui";
import { provide, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { RESIZABLE_ORIENTATION, type Orientation } from "./context";

/**
 * A group of resizable panels and handles. In a horizontal RTL group the first panel sits on the right and
 * the arrow keys and the pointer follow the reading direction.
 */
interface Props {
  /** `horizontal` puts panels side by side; `vertical` stacks them. Default `horizontal`. */
  orientation?: Orientation;
  /** Overrides the direction from the Nasaq provider. Only matters for horizontal groups. */
  dir?: "ltr" | "rtl";
  /** Persists the layout under this key (localStorage). Give every panel an `id` when you use it. */
  autoSaveId?: string;
  /** Arrow-key step, in percent. */
  keyboardResizeBy?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { orientation: "horizontal", dir: undefined, autoSaveId: undefined, keyboardResizeBy: undefined });
const emits = defineEmits<{ layout: [sizes: number[]] }>();
const nq = useNasaq();
provide(RESIZABLE_ORIENTATION, props.orientation);
</script>

<template>
  <ConfigProvider :dir="props.dir ?? nq.direction.value">
    <SplitterGroup
      data-slot="resizable-group"
      :direction="props.orientation"
      :auto-save-id="props.autoSaveId"
      :keyboard-resize-by="props.keyboardResizeBy"
      :class="cn('size-full', props.class)"
      @layout="emits('layout', $event)"
    >
      <slot />
    </SplitterGroup>
  </ConfigProvider>
</template>
