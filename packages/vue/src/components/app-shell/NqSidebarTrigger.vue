<script setup lang="ts">
import { PanelLeft } from "lucide-vue-next";
import { onBeforeUnmount, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { NqTooltip } from "../tooltip";
import { DESKTOP_QUERY, useAppShell } from "./context";

/** Toggles the rail on desktop and opens the sheet on mobile. Place it first in the header. */
interface Props {
  /** Accessible name and tooltip. Default "Toggle sidebar". */
  label?: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const { collapsed, mobileOpen, toggleSidebar } = useAppShell();
const t = useT();

const isDesktop = ref(true);
let mq: MediaQueryList | null = null;
const sync = () => (isDesktop.value = mq?.matches ?? true);
onMounted(() => {
  if (typeof window.matchMedia !== "function") return;
  mq = window.matchMedia(DESKTOP_QUERY);
  sync();
  mq.addEventListener("change", sync);
});
onBeforeUnmount(() => mq?.removeEventListener("change", sync));
</script>

<template>
  <NqTooltip :content="props.label ?? t('Toggle sidebar', 'إظهار/إخفاء الشريط الجانبي')">
    <NqButton
      variant="ghost"
      size="icon-sm"
      :aria-label="props.label ?? t('Toggle sidebar', 'إظهار/إخفاء الشريط الجانبي')"
      :aria-expanded="isDesktop ? !collapsed : mobileOpen"
      :class="cn('-ms-1 text-muted-foreground', props.class)"
      @click="toggleSidebar"
    >
      <NqIcon :icon="PanelLeft" directional />
    </NqButton>
  </NqTooltip>
</template>
