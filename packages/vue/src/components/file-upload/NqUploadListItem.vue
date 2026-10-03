<script setup lang="ts">
import { CircleAlert, FileIcon, ImageIcon, RotateCw, X } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqProgress } from "../progress";
import { formatFileSize, stringsFor, type UploadFile } from "./file-upload-logic";

// One row: icon, name, size, status, a Progress while it is not done, and remove / retry buttons.
interface Props {
  item: UploadFile;
  /** Shows the remove button; listen to `remove`. Default true. */
  removable?: boolean;
  /** Shows the retry button on failed files; listen to `retry`. Default true. */
  retryable?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { removable: true, retryable: true });
const emit = defineEmits<{ remove: [item: UploadFile]; retry: [item: UploadFile] }>();
const nasaq = useNasaq();
const t = computed(() => stringsFor(nasaq.locale.value));
const isImage = computed(() => props.item.file.type.startsWith("image/"));
const statusText = computed(() => t.value[props.item.status]);
</script>

<template>
  <li
    data-slot="file-list-item"
    :data-status="props.item.status"
    :class="cn('flex flex-col gap-2 rounded-control border border-border bg-card p-3', 'data-[status=error]:border-nq-danger', props.class)"
  >
    <div class="flex items-center gap-3">
      <span class="flex size-8 shrink-0 items-center justify-center rounded-control bg-nq-surface-soft text-muted-foreground">
        <CircleAlert v-if="props.item.status === 'error'" aria-hidden="true" class="size-4 text-nq-danger-text" />
        <ImageIcon v-else-if="isImage" aria-hidden="true" class="size-4" />
        <FileIcon v-else aria-hidden="true" class="size-4" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col">
        <bdi data-slot="file-list-name" class="truncate text-label text-foreground" :title="props.item.file.name">{{ props.item.file.name }}</bdi>
        <span class="text-caption text-muted-foreground tabular-nums">{{ formatFileSize(props.item.file.size, nasaq.locale.value) }} · {{ statusText }}</span>
      </div>
      <NqButton v-if="props.item.status === 'error' && props.retryable" type="button" variant="ghost" size="icon-sm" :aria-label="t.retry(props.item.file.name)" @click="emit('retry', props.item)">
        <RotateCw aria-hidden="true" />
      </NqButton>
      <NqButton v-if="props.removable" type="button" variant="ghost" size="icon-sm" :aria-label="t.remove(props.item.file.name)" @click="emit('remove', props.item)">
        <X aria-hidden="true" />
      </NqButton>
    </div>
    <NqProgress
      v-if="props.item.status === 'uploading' || props.item.status === 'pending'"
      :value="props.item.status === 'pending' ? 0 : props.item.progress"
      size="sm"
      :aria-label="`${props.item.file.name} · ${statusText}`"
    />
    <p v-if="props.item.status === 'error' && props.item.error" class="text-caption text-nq-danger-text">{{ props.item.error }}</p>
  </li>
</template>
