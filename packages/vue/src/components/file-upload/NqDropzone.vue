<script setup lang="ts">
import { Upload } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes, type InputHTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { formatFileSize, stringsFor, validateFiles, type FileRejection } from "./file-upload-logic";

// A target for files: click it, press Enter or Space, or drop files on it. It validates `accept`,
// `maxSize` and `maxFiles`, then emits `files` (the good ones) and `reject` (the rest).
interface Props {
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  /** How many files are already added, so `maxFiles` counts them. Default 0. */
  count?: number;
  /** Allow choosing several files. Default true. */
  multiple?: boolean;
  disabled?: boolean;
  /** Marks the zone invalid (shows the danger border). */
  invalid?: boolean;
  /** Extra attributes for the hidden file input, e.g. `name` or `aria-label`. */
  inputProps?: InputHTMLAttributes & Record<string, unknown>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  accept: undefined,
  maxSize: undefined,
  maxFiles: undefined,
  count: 0,
  multiple: true,
  inputProps: undefined,
});
const emit = defineEmits<{
  /** The files that passed validation. */
  files: [files: File[]];
  /** After every drop or pick: the files that did not pass (an empty array when all did). */
  reject: [rejections: FileRejection[]];
}>();

const nasaq = useNasaq();
const t = computed(() => stringsFor(nasaq.locale.value));
const inputEl = ref<HTMLInputElement>();
const dragging = ref(false);
let depth = 0;
const hintId = useId();
const limit = computed(() => (props.multiple ? props.maxFiles : 1));
const limits = computed(() =>
  [props.accept ? t.value.accepted(props.accept) : null, props.maxSize !== undefined ? t.value.upTo(formatFileSize(props.maxSize, nasaq.locale.value)) : null]
    .filter(Boolean)
    .join(" · "),
);

function handle(list: FileList | File[] | null) {
  const files = list ? Array.from(list) : [];
  if (!files.length) return;
  // Single mode replaces rather than appends, so the existing count does not block it.
  const { accepted, rejected } = validateFiles(files, { accept: props.accept, maxSize: props.maxSize, maxFiles: limit.value }, props.multiple ? props.count : 0, nasaq.locale.value);
  if (accepted.length) emit("files", accepted);
  emit("reject", rejected);
}
const open = () => {
  if (!props.disabled) inputEl.value?.click();
};
function onDragEnter(e: DragEvent) {
  if (props.disabled || !e.dataTransfer?.types.includes("Files")) return;
  e.preventDefault();
  depth++;
  dragging.value = true;
}
function onDragLeave() {
  depth = Math.max(0, depth - 1);
  if (depth === 0) dragging.value = false;
}
function onDrop(e: DragEvent) {
  e.preventDefault();
  depth = 0;
  dragging.value = false;
  if (!props.disabled) handle(e.dataTransfer?.files ?? null);
}
function onKeydown(e: KeyboardEvent) {
  if (e.defaultPrevented || e.target !== e.currentTarget) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    open();
  }
}
function onChange(e: Event) {
  const input = e.target as HTMLInputElement;
  handle(input.files);
  input.value = "";
}
</script>

<template>
  <div
    data-slot="dropzone"
    :data-dragging="dragging || undefined"
    :data-disabled="props.disabled || undefined"
    :data-invalid="props.invalid || undefined"
    role="button"
    :tabindex="props.disabled ? -1 : 0"
    :aria-disabled="props.disabled || undefined"
    :aria-describedby="limits ? hintId : undefined"
    :class="
      cn(
        'flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-floating border border-dashed border-input bg-card p-6 text-center',
        'transition-colors duration-150 ease-nq outline-none',
        'hover:bg-nq-hover focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus',
        'data-dragging:border-nq-focus data-dragging:bg-nq-selected',
        'data-invalid:border-nq-danger',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:bg-card',
        props.class,
      )
    "
    @click="open"
    @keydown="onKeydown"
    @dragenter="onDragEnter"
    @dragover="(e: DragEvent) => !props.disabled && e.preventDefault()"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <Upload aria-hidden="true" class="size-6 text-muted-foreground" />
    <span class="text-label text-foreground"><slot>{{ dragging ? t.dropping : t.prompt }}</slot></span>
    <span v-if="limits" :id="hintId" dir="auto" class="text-caption text-muted-foreground">{{ limits }}</span>
    <input
      ref="inputEl"
      type="file"
      class="sr-only"
      tabindex="-1"
      :accept="props.accept"
      :multiple="props.multiple"
      :disabled="props.disabled"
      v-bind="props.inputProps"
      @click.stop
      @change="onChange"
    />
  </div>
</template>
