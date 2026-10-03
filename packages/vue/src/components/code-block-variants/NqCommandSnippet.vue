<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import NqCodeVariantCopy from "./NqCodeVariantCopy.vue";
import { stripPrompt } from "./format";
import { STRINGS, type CodeVariantLabels } from "./strings";

// A one-line command with a copy button that is always visible: `npm i @nasaq/web`. Long commands scroll sideways.
interface Props {
  /** The command. A leading `$ ` is dropped from the copy. */
  command: string;
  /** The prompt glyph shown before the command and never copied. `false` hides it. */
  prompt?: string | false;
  /** Accessible name of the command region. Default "Command". */
  label?: string;
  labels?: Partial<CodeVariantLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { prompt: "$", label: undefined, labels: undefined });
const emit = defineEmits<{ copy: [command: string] }>();
const nq = useNasaq();
const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const clean = computed(() => stripPrompt(props.command));
</script>

<template>
  <div data-slot="command-snippet" dir="ltr" :class="cn('flex h-control items-center gap-1 rounded-control border border-border bg-nq-surface-soft ps-3 pe-1 text-start', props.class)">
    <span v-if="props.prompt !== false" aria-hidden="true" class="select-none font-mono text-code text-muted-foreground">{{ props.prompt }}</span>
    <code
      role="region"
      tabindex="0"
      :aria-label="props.label ?? t.command"
      class="min-w-0 flex-1 overflow-x-auto whitespace-pre py-1 font-mono text-code text-foreground outline-none [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus [&::-webkit-scrollbar]:hidden"
    >{{ clean }}</code>
    <NqCodeVariantCopy :text="clean" :label="t.copyCommand" :done="t.commandCopied" @copy="emit('copy', $event)" />
  </div>
</template>
