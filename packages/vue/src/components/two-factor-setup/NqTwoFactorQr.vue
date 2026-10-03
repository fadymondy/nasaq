<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { encode } from "uqr";
import { cn } from "../../lib/cn";

// A QR code drawn client-side as one SVG path. Dark on light in both themes: scanners need the contrast.
interface Props {
  value: string;
  label: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();

const QUIET = 4;
const qr = computed(() => {
  const code = encode(props.value, { ecc: "M", border: 0 });
  let d = "";
  code.data.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x++;
      d += `M${start + QUIET} ${y + QUIET}h${x - start}v1h-${x - start}z`;
    }
  });
  return { path: d, size: code.size + QUIET * 2 };
});
</script>

<template>
  <svg
    data-slot="two-factor-qr"
    role="img"
    :aria-label="props.label"
    :viewBox="`0 0 ${qr.size} ${qr.size}`"
    shape-rendering="crispEdges"
    :class="cn('aspect-square w-full max-w-48 rounded-control border border-border bg-white', props.class)"
  >
    <path :d="qr.path" class="fill-black" />
  </svg>
</template>
