<script setup lang="ts">
import { NqFileUpload, NqImageUpload, type FileUploadControls, type UploadFile } from "@fadymondy/nasaq/vue";

function send(item: UploadFile, controls: FileUploadControls) {
  const body = new FormData();
  body.append("file", item.file);
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/files");
  xhr.upload.onprogress = (e) => controls.update(item.id, { status: "uploading", progress: Math.round((e.loaded / e.total) * 100) });
  xhr.onload = () => controls.update(item.id, xhr.status < 300 ? { status: "done", progress: 100 } : { status: "error", error: "Upload failed" });
  xhr.onerror = () => controls.update(item.id, { status: "error", error: "Network error" });
  xhr.send(body);
}
</script>

<template>
  <div class="w-96">
    <NqFileUpload
      accept="image/*,.pdf"
      :max-size="5 * 1024 * 1024"
      :max-files="4"
      @files="(added, controls) => added.forEach((f) => send(f, controls))"
      @retry="send"
    />
    <div class="mt-6">
      <NqImageUpload alt="Profile picture" />
    </div>
  </div>
</template>
