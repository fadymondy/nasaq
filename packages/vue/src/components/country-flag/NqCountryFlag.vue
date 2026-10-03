<script setup lang="ts">
import { onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { flagSvg, peekFlag } from "./flags";

const props = defineProps<{
  /** ISO 3166-1 alpha-2 code: "SA", "eg". */
  code: string;
  /** Accessible name, e.g. the country name. Without it the flag is decorative and hidden from screen readers. */
  label?: string;
  class?: HTMLAttributes["class"];
}>();

/**
 * A country's flag as an SVG, 3:2, sized by the font (`1em` tall) so it sits in a line of text.
 * Every platform draws it the same way; flag emoji do not render on Windows. Unknown codes show an empty frame.
 */
const svg = ref<string | undefined>(peekFlag(props.code));

async function load() {
  svg.value = peekFlag(props.code) ?? (await flagSvg(props.code));
}
onMounted(load);
watch(() => props.code, load);
</script>

<template>
  <span
    data-slot="country-flag"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : true"
    :class="
      cn(
        // An inset hairline drawn over the SVG keeps white and pale flags visible on a white surface.
        'relative inline-block aspect-[3/2] h-[1em] shrink-0 overflow-hidden rounded-[2px] bg-muted align-[-0.125em] [&>svg]:block [&>svg]:size-full',
        'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-foreground/15 after:ring-inset',
        props.class,
      )
    "
    v-html="svg"
  />
</template>
