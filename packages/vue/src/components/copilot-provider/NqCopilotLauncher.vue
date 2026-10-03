<script setup lang="ts">
import { Sparkles } from "lucide-vue-next";
import { computed, onMounted, ref, useAttrs } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { isApplePlatform } from "../keyboard-shortcuts/keyboard-shortcuts";
import { useCopilot, type CopilotOpenOptions } from "./copilot-provider-context";
import { copilotLauncherWords, type CopilotLauncherLabels } from "./labels";

// A button that toggles the assistant of the nearest NqCopilotProvider, for a header or toolbar. Other attributes go to the NqButton.
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    /** `header` is an icon and a label for a top bar; `icon` is a square icon button. */
    look?: "header" | "icon";
    /** Shown next to the label, such as "⌘J". Default the platform's ⌘J / Ctrl+J; `false` hides it. */
    shortcut?: string | false;
    /** Opens with this text in the box, or sends it with `autoSend`. */
    openWith?: CopilotOpenOptions;
    labels?: Partial<CopilotLauncherLabels>;
    variant?: "primary" | "secondary" | "ghost" | "danger" | "link";
    size?: "sm" | "md" | "lg" | "icon" | "icon-sm";
  }>(),
  { look: "header", shortcut: undefined, openWith: undefined, labels: undefined, variant: undefined, size: undefined },
);

const copilot = useCopilot();
const nq = useNasaq();
const attrs = useAttrs();
const t = computed(() => copilotLauncherWords(nq.locale.value, props.labels));
const keys = ref<string | null>(props.shortcut === false ? null : (props.shortcut ?? "Ctrl+J"));
// The modifier depends on the platform, which is only known in the browser.
onMounted(() => {
  keys.value = props.shortcut === false ? null : (props.shortcut ?? `${isApplePlatform() ? "⌘" : "Ctrl+"}J`);
});
const name = computed(() => (copilot.isOpen ? t.value.close : t.value.open));
const header = computed(() => props.look === "header");
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});
</script>

<template>
  <NqButton
    v-bind="rest"
    data-slot="copilot-launcher"
    :variant="props.variant ?? (header ? 'secondary' : 'ghost')"
    :size="props.size ?? (header ? 'sm' : 'icon')"
    :aria-expanded="copilot.isOpen"
    :aria-label="header ? undefined : name"
    :title="keys ? `${name} (${keys})` : name"
    :class="cn(header && 'gap-2', attrs.class as string)"
    @click="copilot.isOpen ? copilot.close() : copilot.open(props.openWith)"
  >
    <slot name="icon"><Sparkles aria-hidden="true" /></slot>
    <template v-if="header">
      <span>{{ t.label }}</span>
      <kbd v-if="keys" dir="ltr" class="hidden rounded-sm border border-border px-1 font-mono text-[11px] text-muted-foreground sm:inline">{{ keys }}</kbd>
    </template>
  </NqButton>
</template>
