<script setup lang="ts">
import { X } from "lucide-vue-next";
import { useObjectUrl } from "../file-upload";

// One chosen photo of a return request, with a remove button. Internal to NqStoreReturnRequest.
const props = defineProps<{ file: File; label: string }>();
const emit = defineEmits<{ remove: [] }>();
const url = useObjectUrl(() => props.file);
</script>

<template>
  <li class="relative size-20 overflow-hidden rounded-control border border-border bg-secondary">
    <img v-if="url" :src="url" :alt="props.file.name" class="size-full object-cover" />
    <button
      type="button"
      :aria-label="`${props.label}: ${props.file.name}`"
      class="absolute end-1 top-1 inline-flex size-6 items-center justify-center rounded-full border border-border bg-card text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
      @click="emit('remove')"
    >
      <X aria-hidden="true" class="size-3.5" />
    </button>
  </li>
</template>
