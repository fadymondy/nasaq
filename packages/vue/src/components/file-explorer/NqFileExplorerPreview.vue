<script setup lang="ts">
import { Download, Trash2, X } from "lucide-vue-next";
import { computed } from "vue";
import { NqButton } from "../button";
import { NqCodeBlock } from "../code-block";
import { formatFileSize } from "../file-upload";
import { NqDateTime } from "../numeric";
import { extension, fileKind } from "./file-format";
import NqFileKindIcon from "./NqFileKindIcon.vue";
import type { FileExplorerLabels } from "./strings";
import type { FileNode } from "./types";

// The preview pane body for one file: preview, details, Download and Delete. Used by NqFileExplorer.
const props = defineProps<{
  file: FileNode;
  trail: readonly FileNode[];
  root: string;
  t: FileExplorerLabels;
  locale: string;
  canDownload: boolean;
  canDelete: boolean;
}>();
const emit = defineEmits<{ close: []; download: []; delete: [] }>();
const kind = computed(() => fileKind(props.file));
const ext = computed(() => extension(props.file.name));
const location = computed(() => [props.root, ...props.trail.map((n) => n.name)].join(" / "));
</script>

<template>
  <div data-slot="file-preview" class="flex flex-col gap-3">
    <div class="flex items-start justify-between gap-2">
      <bdi dir="auto" class="min-w-0 break-words text-label text-foreground">{{ props.file.name }}</bdi>
      <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="props.t.closePreview" @click="emit('close')">
        <X aria-hidden="true" />
      </NqButton>
    </div>
    <div class="flex min-h-32 items-center justify-center overflow-hidden rounded-control bg-secondary">
      <img v-if="kind === 'image' && props.file.previewUrl" :src="props.file.previewUrl" :alt="props.file.name" class="max-h-64 w-full object-contain" />
      <NqCodeBlock v-else-if="props.file.previewText !== undefined" :code="props.file.previewText" :language="ext || 'text'" :filename="props.file.name" class="w-full" pre-class-name="max-h-64" />
      <div v-else class="flex flex-col items-center gap-2 p-6 text-center">
        <NqFileKindIcon :kind="kind" class="size-10" />
        <span class="text-caption text-muted-foreground">{{ props.t.noPreview }}</span>
      </div>
    </div>
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-body-sm">
      <dt class="text-muted-foreground">{{ props.t.type }}</dt>
      <dd>{{ props.t.kinds[kind] }}</dd>
      <template v-if="props.file.size !== undefined">
        <dt class="text-muted-foreground">{{ props.t.size }}</dt>
        <dd><bdi dir="ltr">{{ formatFileSize(props.file.size, props.locale) }}</bdi></dd>
      </template>
      <template v-if="props.file.modifiedAt">
        <dt class="text-muted-foreground">{{ props.t.modified }}</dt>
        <dd><NqDateTime :value="props.file.modifiedAt" :format="{ dateStyle: 'medium', timeStyle: 'short' }" /></dd>
      </template>
      <dt class="text-muted-foreground">{{ props.t.location }}</dt>
      <dd class="min-w-0 break-words"><bdi dir="auto">{{ location }}</bdi></dd>
    </dl>
    <div v-if="props.canDownload || props.canDelete" class="flex flex-wrap gap-2">
      <NqButton v-if="props.canDownload" type="button" size="sm" @click="emit('download')">
        <Download aria-hidden="true" />
        {{ props.t.download }}
      </NqButton>
      <NqButton v-if="props.canDelete" type="button" size="sm" variant="ghost" class="text-nq-danger-text" @click="emit('delete')">
        <Trash2 aria-hidden="true" />
        {{ props.t.remove }}
      </NqButton>
    </div>
  </div>
</template>
