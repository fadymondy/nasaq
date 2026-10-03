<script setup lang="ts">
import { ref } from "vue";
import { NqAvatarUpload } from "@fadymondy/nasaq/vue";

const avatarUrl = ref<string | undefined>(undefined);

async function upload(file: File, onProgress: (percent: number) => void) {
  // Your request; resolve when saved.
  onProgress(100);
  avatarUrl.value = URL.createObjectURL(file);
}
</script>

<template>
  <NqAvatarUpload name="Sara Alharbi" :src="avatarUrl" :output-size="256" :on-change="(file, { onProgress }) => upload(file, onProgress)" :on-remove="async () => { avatarUrl = undefined; }" />
</template>
