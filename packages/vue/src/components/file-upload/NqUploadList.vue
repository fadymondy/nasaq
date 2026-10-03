<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { stringsFor, type UploadFile } from "./file-upload-logic";
import NqUploadListItem from "./NqUploadListItem.vue";

// The uploaded and uploading files. Renders nothing when empty.
interface Props {
  items: readonly UploadFile[];
  removable?: boolean;
  retryable?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { removable: true, retryable: true });
const emit = defineEmits<{ remove: [item: UploadFile]; retry: [item: UploadFile] }>();
const nasaq = useNasaq();
const t = computed(() => stringsFor(nasaq.locale.value));
</script>

<template>
  <ul v-if="props.items.length" data-slot="file-list" :aria-label="t.list" :class="cn('flex flex-col gap-2', props.class)">
    <NqUploadListItem
      v-for="item in props.items"
      :key="item.id"
      :item="item"
      :removable="props.removable"
      :retryable="props.retryable"
      @remove="emit('remove', $event)"
      @retry="emit('retry', $event)"
    />
  </ul>
</template>
