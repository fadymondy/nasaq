<script setup lang="ts">
import { provide, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { TABLE_STYLE, type TableDensity } from "./context";

// Scrolls horizontally inside its own box so wide tables never break the page.
interface Props {
  /** Accessible name of the scroll region (keyboard users can focus and scroll it). Localise it. */
  label?: string;
  /** Cell padding. default leaves room to read a row at a glance; compact fits more rows. */
  density?: TableDensity;
  /** A rounded border around the table, with a tinted header. */
  frame?: boolean;
  /** Lines between columns as well as rows. */
  bordered?: boolean;
  /** Every other body row tinted, to follow a row across a wide table. */
  striped?: boolean;
  /** Highlight the row under the pointer. Default true. */
  hover?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { density: "default", frame: false, bordered: false, striped: false, hover: true });
provide(TABLE_STYLE, () => ({ density: props.density, hover: props.hover, striped: props.striped }));
defineOptions({ inheritAttrs: false });
</script>

<template>
  <div
    data-slot="table-container"
    role="region"
    tabindex="0"
    :aria-label="props.label"
    :class="
      cn(
        'relative w-full overflow-x-auto outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
        props.frame && 'rounded-card border border-border bg-card',
      )
    "
  >
    <table
      v-bind="$attrs"
      data-slot="table"
      :data-density="props.density"
      :data-frame="props.frame || undefined"
      :data-bordered="props.bordered || undefined"
      :data-striped="props.striped || undefined"
      :class="
        cn(
          'w-full caption-bottom border-collapse text-body-sm',
          props.frame && '[&_thead]:bg-secondary/50',
          props.bordered && '[&_td:not(:last-child)]:border-e [&_td]:border-border [&_th:not(:last-child)]:border-e [&_th]:border-border',
          props.class,
        )
      "
    >
      <slot />
    </table>
  </div>
</template>
