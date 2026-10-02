<script setup lang="ts">
import { FileText, Loader2, X } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { copilotFormatBytes, copilotIsPreviewUrl, type CopilotAttachment } from "./copilot-format";
import { copilotWords, type CopilotChatLabels } from "./labels";

// One file in the composer or on a sent message: a thumbnail or an icon, the name, the size or upload progress.
const props = defineProps<{
  attachment: CopilotAttachment;
  /** Shows a remove button. */
  onRemove?: () => void;
  labels?: Partial<CopilotChatLabels>;
  class?: HTMLAttributes["class"];
}>();
const nq = useNasaq();
const t = computed(() => copilotWords(nq.locale.value, props.labels));
const a = computed(() => props.attachment);
const image = computed(() => !!a.value.type?.startsWith("image/") && copilotIsPreviewUrl(a.value.url));
const busy = computed(() => a.value.progress !== undefined && a.value.progress < 1 && !a.value.error);
const detail = computed(() => a.value.error ?? (busy.value ? `${Math.round((a.value.progress ?? 0) * 100)}%` : copilotFormatBytes(a.value.size, nq.locale.value)));
</script>

<template>
  <span
    data-slot="copilot-attachment"
    :data-error="a.error ? '' : undefined"
    :title="a.error ?? a.name"
    :class="cn('inline-flex max-w-56 items-center gap-2 rounded-control border bg-card p-1 pe-1.5 text-caption', a.error ? 'border-nq-danger' : 'border-border', props.class)"
  >
    <img v-if="image" :src="a.url" alt="" class="size-8 shrink-0 rounded-sm object-cover" />
    <span v-else aria-hidden="true" class="grid size-8 shrink-0 place-items-center rounded-sm bg-secondary text-muted-foreground"><FileText class="size-4" /></span>
    <span class="flex min-w-0 flex-col">
      <span dir="auto" class="truncate text-foreground">{{ a.name }}</span>
      <span :class="cn('truncate text-[11px] tabular-nums', a.error ? 'text-nq-danger-text' : 'text-muted-foreground')">{{ detail }}</span>
    </span>
    <Loader2 v-if="busy" aria-hidden="true" class="size-3.5 shrink-0 text-muted-foreground motion-safe:animate-spin" />
    <button
      v-if="props.onRemove"
      type="button"
      :aria-label="t.removeAttachment(a.name)"
      class="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
      @click="props.onRemove()"
    >
      <X aria-hidden="true" class="size-3" />
    </button>
  </span>
</template>
