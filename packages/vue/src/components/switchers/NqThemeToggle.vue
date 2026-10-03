<script setup lang="ts">
import { Moon, Sun } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqTooltip } from "../tooltip";
import { playClick } from "./click-sound";
import { themeLabelsFor, type ThemeLabels } from "./labels";

// One icon button that flips light and dark. The sun and the moon cross-fade and counter-rotate; under reduced
// motion they swap without moving. It sets an explicit theme, so the first click leaves "system".
interface Props {
  labels?: Partial<ThemeLabels>;
  /** Play a soft click on switch. Always silent under reduced motion. Default true. */
  sound?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { sound: true });
const nq = useNasaq();
const t = computed(() => themeLabelsFor(nq.locale.value, props.labels));
const dark = computed(() => nq.resolvedTheme.value === "dark");
const name = computed(() => (dark.value ? t.value.toLight : t.value.toDark));
const glyph = "absolute inset-0 m-auto transition-[opacity,rotate,scale] duration-300 ease-nq motion-reduce:transition-none";
function toggle() {
  if (props.sound) playClick();
  nq.setTheme(dark.value ? "light" : "dark");
}
</script>

<template>
  <NqTooltip :content="name">
    <NqButton
      data-slot="theme-toggle"
      :data-state="dark ? 'dark' : 'light'"
      variant="ghost"
      size="icon-sm"
      :aria-label="name"
      :class="cn('relative overflow-hidden text-muted-foreground hover:text-foreground', props.class)"
      @click="toggle"
    >
      <Sun aria-hidden="true" :class="cn(glyph, dark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100')" />
      <Moon aria-hidden="true" :class="cn(glyph, dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0')" />
    </NqButton>
  </NqTooltip>
</template>
