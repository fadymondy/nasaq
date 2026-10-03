<script setup lang="ts">
import { X } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqProgress } from "../progress";
import { stringsFor, useObjectUrl, type FileRejection } from "./file-upload-logic";
import NqDropzone from "./NqDropzone.vue";

// A single image with a thumbnail preview (an object URL, revoked on cleanup), replace and remove.
interface Props {
  /** The chosen image. Use `v-model` (`null` for none). Omit to let the component own it. */
  modelValue?: File | null;
  defaultValue?: File | null;
  /** An already-saved image URL shown until a file is chosen (an existing avatar). */
  src?: string;
  /** Native accept syntax. Default "image/*". */
  accept?: string;
  maxSize?: number;
  /** 0 to 100 while you upload the chosen image; leave unset to hide the bar. */
  progress?: number | null;
  /** Accessible description of the image, used as the preview's alt text. */
  alt?: string;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultValue: null, src: undefined, accept: "image/*", maxSize: undefined, progress: undefined, alt: "" });
const emit = defineEmits<{
  "update:modelValue": [file: File | null];
  /** The user removed the image, including a saved `src`. */
  remove: [];
}>();
defineSlots<{ default?: () => unknown }>();

const nasaq = useNasaq();
const t = computed(() => stringsFor(nasaq.locale.value));
const inner = ref<File | null>(props.defaultValue);
const file = computed(() => (props.modelValue !== undefined ? props.modelValue : inner.value));
const removedSrc = ref(false);
const rejections = ref<FileRejection[]>([]);
const url = useObjectUrl(file);
const preview = computed(() => url.value ?? (removedSrc.value ? null : (props.src ?? null)));

function set(next: File | null) {
  inner.value = next;
  emit("update:modelValue", next);
}
function removeImage() {
  removedSrc.value = true;
  set(null);
  emit("remove");
}
</script>

<template>
  <div data-slot="image-upload" :class="cn('flex flex-col items-start gap-2', props.class)">
    <div v-if="preview" data-slot="image-upload-preview" class="relative size-32 overflow-hidden rounded-floating border border-border bg-nq-surface-soft">
      <img :src="preview" :alt="props.alt" class="size-full object-cover" />
      <div v-if="props.progress !== undefined && props.progress !== null && props.progress < 100" class="absolute inset-x-0 bottom-0 bg-card/80 p-2">
        <NqProgress :value="props.progress" size="sm" :aria-label="file?.name ?? (props.alt || t.uploading)" />
      </div>
      <NqButton type="button" size="icon-sm" variant="secondary" :disabled="props.disabled" :aria-label="t.removeImage" class="absolute end-1 top-1" @click="removeImage">
        <X aria-hidden="true" />
      </NqButton>
    </div>
    <NqDropzone
      :accept="props.accept"
      :max-size="props.maxSize"
      :multiple="false"
      :disabled="props.disabled"
      :invalid="rejections.length > 0"
      :class="preview ? 'min-h-0 w-32 p-3' : 'size-32 min-h-0 p-3'"
      @reject="rejections = $event"
      @files="set($event[0] ?? null)"
    >
      <slot>{{ preview ? t.replace : t.promptImage }}</slot>
    </NqDropzone>
    <p v-if="rejections.length" role="alert" class="text-caption text-nq-danger-text">{{ rejections[0]?.message }}</p>
  </div>
</template>
