<script setup lang="ts">
import { Clock } from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useUpgradeStrings } from "./strings";

// "2d 04:13:09", with Latin digits so it reads the same in Arabic. Internal to NqUpgradeDialog.
interface Props {
  /** When the offer ends. */
  endsAt: Date | string | number;
  label: string;
}
const props = defineProps<Props>();
const { t } = useUpgradeStrings();
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 1000);
});
onBeforeUnmount(() => clearInterval(timer));
const parts = computed(() => {
  const s = Math.floor(Math.max(0, new Date(props.endsAt).getTime() - now.value) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { d: Math.floor(s / 86400), clock: `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` };
});
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
    <Clock aria-hidden="true" class="size-3.5" />
    {{ props.label }}
    <span dir="ltr" class="font-mono text-foreground tabular-nums" role="timer" aria-live="off">{{ parts.d > 0 ? `${parts.d}${t.days} ` : "" }}{{ parts.clock }}</span>
  </span>
</template>
