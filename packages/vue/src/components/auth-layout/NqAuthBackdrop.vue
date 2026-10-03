<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// The decorative scene behind the auth page: a plain lattice of tiny cubes, and the cubes under the pointer light up
// while it moves. Purely visual: hidden from assistive tech and pointer events. The pointer light is off with reduced motion.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const el = ref<HTMLDivElement | null>(null);
let frame = 0;
let off: (() => void) | undefined;

onMounted(() => {
  const node = el.value;
  if (!node || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const move = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const rect = node.getBoundingClientRect();
      node.style.setProperty("--nq-auth-x", `${event.clientX - rect.left}px`);
      node.style.setProperty("--nq-auth-y", `${event.clientY - rect.top}px`);
      node.setAttribute("data-pointer", "");
    });
  };
  const leave = () => node.removeAttribute("data-pointer");
  window.addEventListener("pointermove", move, { passive: true });
  document.documentElement.addEventListener("pointerleave", leave);
  off = () => {
    window.removeEventListener("pointermove", move);
    document.documentElement.removeEventListener("pointerleave", leave);
  };
});
onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  off?.();
});
</script>

<template>
  <div ref="el" data-slot="auth-backdrop" aria-hidden="true" :class="cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', props.class)">
    <div data-auth-layer="cubes" />
    <div data-auth-layer="pointer" />
  </div>
</template>
