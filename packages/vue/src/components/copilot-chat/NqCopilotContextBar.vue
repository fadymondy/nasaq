<script setup lang="ts">
import { Plus, X } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuItem, NqDropdownMenuTrigger } from "../dropdown-menu";
import { copilotAvailableContext, copilotWithoutContext, type CopilotContextItem } from "./copilot-format";
import { copilotWords, type CopilotChatLabels } from "./labels";

// The chips row above the box: what the next prompt will see. With `onChange` the chips can be removed and more added from `options`.
const props = defineProps<{
  items: readonly CopilotContextItem[];
  onChange?: (items: CopilotContextItem[]) => void;
  options?: readonly CopilotContextItem[];
  labels?: Partial<CopilotChatLabels>;
  class?: HTMLAttributes["class"];
}>();
const nq = useNasaq();
const t = computed(() => copilotWords(nq.locale.value, props.labels));
const more = computed(() => copilotAvailableContext(props.options ?? [], props.items));
</script>

<template>
  <div v-if="props.items.length > 0 || more.length > 0" role="group" :aria-label="t.context" data-slot="copilot-context" :class="cn('flex flex-wrap items-center gap-1.5', props.class)">
    <span v-for="i in props.items" :key="i.id" class="inline-flex max-w-48 items-center gap-1 rounded-full border border-border bg-secondary ps-2.5 pe-1 text-caption text-foreground">
      <span v-if="i.kind" class="text-muted-foreground">{{ i.kind }}</span>
      <span dir="auto" class="truncate">{{ i.label }}</span>
      <button
        v-if="props.onChange"
        type="button"
        :aria-label="t.removeContext(i.label)"
        class="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
        @click="props.onChange(copilotWithoutContext(props.items, i.id))"
      >
        <X aria-hidden="true" class="size-3" />
      </button>
    </span>
    <NqDropdownMenu v-if="props.onChange && more.length > 0">
      <NqDropdownMenuTrigger
        as="button"
        :aria-label="t.addContext"
        class="inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-border px-2 text-caption text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
      >
        <Plus aria-hidden="true" class="size-3" />
        {{ t.addContext }}
      </NqDropdownMenuTrigger>
      <NqDropdownMenuContent>
        <NqDropdownMenuItem v-for="o in more" :key="o.id" @select="props.onChange?.([...props.items, o])">
          <span v-if="o.kind" class="text-muted-foreground">{{ o.kind }}</span>
          <span dir="auto">{{ o.label }}</span>
        </NqDropdownMenuItem>
      </NqDropdownMenuContent>
    </NqDropdownMenu>
  </div>
</template>
