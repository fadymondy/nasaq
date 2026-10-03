<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqProductMark } from "../product-mark";
import { EMBLEM_CELLS, EMBLEM_RINGS } from "./emblem";

// The identity emblem at the top of the card: the product mark inside rings of lattice cubes coloured from the brand
// tokens. It sweeps in once, then the mark turns into a lock that clicks shut; after that the rings only turn, very slowly.
// While a sign-in request runs (any `aria-busy` control in the layout, or `busy`) it scans. Decorative: the name comes from the page heading.
interface Props {
  /** Rendered size in px (square). Default 112. */
  size?: number;
  /** After the entrance the mark turns into a lock that clicks shut. Default true. */
  lock?: boolean;
  /** Scan the rings, for a pending request outside an `AuthLayout`. */
  busy?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { size: 112, lock: true, busy: undefined });
const core = computed(() => Math.round(props.size * 0.3));
const rings = EMBLEM_RINGS.map((_, ring) => EMBLEM_CELLS.filter((cell) => cell.ring === ring));
</script>

<template>
  <div data-slot="auth-emblem" :data-busy="props.busy || undefined" aria-hidden="true" :class="cn('relative grid shrink-0 place-items-center', props.class)" :style="{ width: `${props.size}px`, height: `${props.size}px` }">
    <svg viewBox="-60 -60 120 120" :width="props.size" :height="props.size" class="absolute inset-0 overflow-visible">
      <g v-for="(cells, ring) in rings" :key="ring" :data-emblem-ring="ring">
        <g v-for="cell in cells" :key="cell.key" :transform="`translate(${cell.x.toFixed(2)} ${cell.y.toFixed(2)}) rotate(${(cell.angle + 45).toFixed(1)})`">
          <rect
            data-emblem-cell=""
            :x="-cell.size / 2"
            :y="-cell.size / 2"
            :width="cell.size"
            :height="cell.size"
            :rx="cell.size * 0.22"
            :style="{ fill: cell.fill, opacity: cell.opacity, '--nq-emblem-t': cell.t, '--nq-emblem-ring': cell.ring }"
          />
        </g>
      </g>
    </svg>
    <span data-emblem-core="" :data-lock="props.lock ? '' : undefined" class="relative grid place-items-center *:col-start-1 *:row-start-1">
      <span data-emblem-mark="" class="grid place-items-center">
        <slot><NqProductMark :size="core" /></slot>
      </span>
      <svg v-if="props.lock" data-emblem-lock="" viewBox="0 0 24 24" :width="core" :height="core" class="overflow-visible">
        <path data-emblem-shackle="" d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" fill="none" stroke="var(--nq-action)" stroke-width="2.4" stroke-linecap="round" />
        <rect x="4" y="10.5" width="16" height="11.5" rx="3" fill="var(--nq-action)" />
        <path d="M12 14.6v3" stroke="var(--nq-on-action)" stroke-width="2.2" stroke-linecap="round" />
      </svg>
    </span>
  </div>
</template>
