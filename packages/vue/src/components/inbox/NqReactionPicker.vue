<script setup lang="ts">
import { Smile } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { NqButton } from "../button";
import { NqPopover, NqPopoverClose, NqPopoverContent, NqPopoverTrigger } from "../popover";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";

// A small popover with six quick reactions.
const props = defineProps<{ onPick: (emoji: string) => void; labels?: Partial<InboxLabels>; class?: HTMLAttributes["class"] }>();
const t = useInboxLabels(() => props.labels);
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "🙏", "🎉"] as const;
</script>

<template>
  <NqPopover>
    <NqPopoverTrigger as-child>
      <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.react" :class="props.class">
        <Smile aria-hidden="true" />
      </NqButton>
    </NqPopoverTrigger>
    <NqPopoverContent side="top" align="center" class="flex w-auto gap-0.5 p-1">
      <NqPopoverClose
        v-for="e in QUICK_REACTIONS"
        :key="e"
        :aria-label="e"
        class="grid size-8 place-items-center rounded-control text-lg outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
        @click="props.onPick(e)"
      >
        {{ e }}
      </NqPopoverClose>
    </NqPopoverContent>
  </NqPopover>
</template>
