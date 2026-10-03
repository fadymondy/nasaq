<script setup lang="ts">
import { History, Trash2 } from "lucide-vue-next";
import { ref } from "vue";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqPopover, NqPopoverContent, NqPopoverTrigger } from "../popover";
import { NqDateTime } from "../numeric";
import type { CopilotSessionSummary } from "./copilot-format";
import type { CopilotChatLabels } from "./labels";

// The History menu of the header: saved conversations, the active one marked, each with a delete button when `onDelete` is set.
const props = defineProps<{
  sessions: readonly CopilotSessionSummary[];
  activeId?: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  t: CopilotChatLabels;
}>();
useNasaq();
const open = ref(false);
function pick(id: string) {
  props.onSelect(id);
  open.value = false;
}
</script>

<template>
  <NqPopover v-model:open="open">
    <NqPopoverTrigger as-child>
      <NqButton variant="ghost" size="icon-sm" :aria-label="props.t.history" :title="props.t.history"><History aria-hidden="true" class="size-4" /></NqButton>
    </NqPopoverTrigger>
    <NqPopoverContent align="end" class="w-72 p-1">
      <p v-if="props.sessions.length === 0" class="px-3 py-4 text-center text-caption text-muted-foreground">{{ props.t.noHistory }}</p>
      <ul v-else :aria-label="props.t.history" data-slot="copilot-history" class="flex max-h-80 flex-col overflow-y-auto">
        <li v-for="s in props.sessions" :key="s.id" class="group flex items-center gap-1">
          <button
            type="button"
            :aria-current="s.id === props.activeId ? 'true' : undefined"
            class="flex min-w-0 flex-1 flex-col rounded-control px-2.5 py-1.5 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-[current]:bg-nq-selected"
            @click="pick(s.id)"
          >
            <span dir="auto" class="truncate text-body-sm text-foreground">{{ s.title }}</span>
            <NqDateTime v-if="s.at !== undefined" :value="s.at" :format="{ dateStyle: 'medium', timeStyle: 'short' }" class="text-[11px] text-muted-foreground" />
          </button>
          <NqButton v-if="props.onDelete" variant="ghost" size="icon-sm" :aria-label="props.t.deleteSession(s.title)" :title="props.t.deleteSession(s.title)" @click="props.onDelete(s.id)">
            <Trash2 aria-hidden="true" class="size-3.5" />
          </NqButton>
        </li>
      </ul>
    </NqPopoverContent>
  </NqPopover>
</template>
