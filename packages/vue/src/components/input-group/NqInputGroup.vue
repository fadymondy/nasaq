<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// The bordered shell. It owns the border, height, focus ring and invalid state so addons and the input read as
// one control. Put NqInputGroupAddon before/after the NqInputGroupInput; DOM order is visual order and mirrors in RTL.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div
    role="group"
    data-slot="input-group"
    :class="
      cn(
        'group/input-group flex h-control min-h-[var(--nq-touch-min,0px)] w-full min-w-0 items-center overflow-hidden rounded-control border border-input bg-card text-body text-foreground',
        'transition-colors duration-150 ease-nq',
        'focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus',
        'has-[[data-invalid]]:border-nq-danger has-[[aria-invalid=true]]:border-nq-danger',
        'has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
