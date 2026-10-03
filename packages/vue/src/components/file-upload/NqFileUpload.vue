<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { nextUploadId, type FileRejection, type FileUploadControls, type UploadFile } from "./file-upload-logic";
import NqDropzone from "./NqDropzone.vue";
import NqUploadList from "./NqUploadList.vue";

// Dropzone plus file list. You own the transport: `files` hands you the new files (status "pending") and the
// controls to report progress. Works with `v-model` or on its own.
interface Props {
  /** Files. Use `v-model`. Omit to let the component own the list. */
  modelValue?: readonly UploadFile[];
  defaultValue?: readonly UploadFile[];
  /** Native `accept` syntax: "image/*,.pdf". */
  accept?: string;
  /** Largest allowed file, in bytes. */
  maxSize?: number;
  /** Largest number of files in total (already-added files count). */
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultValue: () => [], accept: undefined, maxSize: undefined, maxFiles: undefined, multiple: true });
const emit = defineEmits<{
  "update:modelValue": [files: UploadFile[]];
  /** The newly added files (status "pending"). Start the upload here and report progress through `controls.update`. */
  files: [added: UploadFile[], controls: FileUploadControls];
  /** The retry button of a failed file was pressed. Restart the upload and call `controls.update`. */
  retry: [item: UploadFile, controls: FileUploadControls];
  /** A file was removed from the list. Cancel its request here. */
  remove: [item: UploadFile];
}>();
defineSlots<{ default?: () => unknown }>();

const inner = ref<readonly UploadFile[]>(props.defaultValue);
const items = computed(() => props.modelValue ?? inner.value);
let latest: readonly UploadFile[] = items.value;
const rejections = ref<FileRejection[]>([]);

function commit(next: UploadFile[]) {
  latest = next;
  inner.value = next;
  emit("update:modelValue", next);
}
const controls: FileUploadControls = {
  update: (id, patch) => commit(latest.map((f) => (f.id === id ? { ...f, ...patch } : f))),
  remove: (id) => commit(latest.filter((f) => f.id !== id)),
};

function onFiles(files: File[]) {
  latest = items.value;
  const added: UploadFile[] = files.map((file) => ({ id: nextUploadId(), file, status: "pending", progress: 0 }));
  commit([...latest, ...added]);
  emit("files", added, controls);
}
function onRemove(item: UploadFile) {
  latest = items.value;
  controls.remove(item.id);
  emit("remove", item);
}
</script>

<template>
  <div data-slot="file-upload" :class="cn('flex flex-col gap-3', props.class)">
    <NqDropzone
      :accept="props.accept"
      :max-size="props.maxSize"
      :max-files="props.maxFiles"
      :multiple="props.multiple"
      :disabled="props.disabled"
      :invalid="rejections.length > 0"
      :count="items.length"
      @reject="rejections = $event"
      @files="onFiles"
    >
      <slot />
    </NqDropzone>
    <ul v-if="rejections.length" data-slot="file-upload-errors" role="alert" class="flex flex-col gap-1 text-caption text-nq-danger-text">
      <li v-for="(r, i) in rejections" :key="`${r.file.name}-${i}`">{{ r.message }}</li>
    </ul>
    <NqUploadList :items="items" @remove="onRemove" @retry="emit('retry', $event, controls)" />
  </div>
</template>
