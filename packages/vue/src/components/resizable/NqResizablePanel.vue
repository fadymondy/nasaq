<script setup lang="ts">
import { SplitterPanel } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { parseSize } from "./context";

/** One pane. Sizes are numbers (pixels) or strings with a unit (`"30%"`, `"20rem"`). Give every panel an `id` when you persist the layout. */
interface Props {
  id?: string;
  defaultSize?: number | string;
  minSize?: number | string;
  maxSize?: number | string;
  collapsible?: boolean;
  collapsedSize?: number | string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { collapsible: undefined });
const emits = defineEmits<{ collapse: []; expand: []; resize: [size: number, prev: number | undefined] }>();

const sizes = computed(() => {
  const d = parseSize(props.defaultSize);
  const min = parseSize(props.minSize);
  const max = parseSize(props.maxSize);
  const c = parseSize(props.collapsedSize);
  const unit = (d ?? min ?? max ?? c)?.unit ?? "%";
  const of = (s: ReturnType<typeof parseSize>) => (s && s.unit === unit ? s.value : undefined);
  return { unit, d: of(d), min: of(min), max: of(max), c: of(c) };
});
</script>

<template>
  <SplitterPanel
    data-slot="resizable-panel"
    :id="props.id"
    :size-unit="sizes.unit"
    :default-size="sizes.d"
    :min-size="sizes.min"
    :max-size="sizes.max"
    :collapsible="props.collapsible"
    :collapsed-size="sizes.c"
    :class="cn('min-w-0', props.class)"
    @collapse="emits('collapse')"
    @expand="emits('expand')"
    @resize="(size: number, prev: number | undefined) => emits('resize', size, prev)"
  >
    <slot />
  </SplitterPanel>
</template>
