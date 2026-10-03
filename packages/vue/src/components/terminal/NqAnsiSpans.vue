<script setup lang="ts">
import { cn } from "../../lib/cn";
import type { AnsiSpan } from "./ansi";

defineProps<{ spans: AnsiSpan[] }>();

function spanStyle(s: AnsiSpan["style"]) {
  const fg = s.inverse ? (s.bg ?? "var(--nq-surface-soft)") : s.fg;
  const bg = s.inverse ? (s.fg ?? "var(--nq-fg)") : s.bg;
  if (!fg && !bg && !s.dim) return undefined;
  return { ...(fg ? { color: fg } : {}), ...(bg ? { backgroundColor: bg } : {}), ...(s.dim ? { opacity: 0.65 } : {}) };
}
</script>

<template>
  <span
    v-for="(s, i) in spans"
    :key="i"
    :style="spanStyle(s.style)"
    :class="cn(s.style.bold && 'font-bold', s.style.italic && 'italic', (s.style.underline || s.style.strike) && 'underline', s.style.strike && 'line-through')"
    >{{ s.text }}</span
  >
</template>
