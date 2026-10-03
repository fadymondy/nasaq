<script setup lang="ts">
import { FileText } from "lucide-vue-next";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { copilotHostOf, copilotIsSafeUrl, type CopilotSource } from "./copilot-format";
import { copilotWords, type CopilotChatLabels } from "./labels";

// The numbered sources under an answer. Only http(s) urls become links.
const props = defineProps<{ sources: readonly CopilotSource[]; labels?: Partial<CopilotChatLabels> }>();
const nq = useNasaq();
const t = computed(() => copilotWords(nq.locale.value, props.labels));
const box = "flex max-w-56 items-center gap-2 rounded-control border border-border bg-card px-2 py-1.5";
</script>

<template>
  <div v-if="props.sources.length > 0" data-slot="copilot-sources" class="flex flex-col gap-1.5">
    <span class="text-caption text-muted-foreground">{{ t.sources }}</span>
    <ol class="flex flex-wrap gap-2">
      <li v-for="(s, i) in props.sources" :key="s.id" class="min-w-0">
        <component
          :is="copilotIsSafeUrl(s.url) ? 'a' : 'span'"
          :href="copilotIsSafeUrl(s.url) ? s.url : undefined"
          :target="copilotIsSafeUrl(s.url) ? '_blank' : undefined"
          :rel="copilotIsSafeUrl(s.url) ? 'noopener noreferrer' : undefined"
          :title="s.snippet"
          :class="cn(box, copilotIsSafeUrl(s.url) && 'outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus')"
        >
          <FileText v-if="!copilotIsSafeUrl(s.url) && s.snippet" aria-hidden="true" class="size-3.5 shrink-0 text-muted-foreground" />
          <span class="grid size-4 shrink-0 place-items-center rounded-full bg-secondary text-[10px] tabular-nums text-muted-foreground">{{ i + 1 }}</span>
          <span class="flex min-w-0 flex-col">
            <span dir="auto" class="truncate text-caption text-foreground">{{ s.title }}</span>
            <span v-if="copilotHostOf(s.url)" dir="ltr" class="truncate text-[11px] text-muted-foreground">{{ copilotHostOf(s.url) }}</span>
          </span>
        </component>
      </li>
    </ol>
  </div>
</template>
