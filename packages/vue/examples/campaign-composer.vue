<script setup lang="ts">
import { NqCampaignComposer, type CampaignDraft } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const progress = ref<{ sent: number; failed: number; total: number } | null>(null);

async function sendTest(_draft: CampaignDraft, _to: string) {
  // Your request.
}
async function startSend(_draft: CampaignDraft) {
  // Your request, then set `progress` as the send advances.
  progress.value = { sent: 0, failed: 0, total: 1240 };
}
</script>

<template>
  <NqCampaignComposer
    :audiences="[{ id: 'all', label: 'Everyone', counts: { email: 1240, whatsapp: 610 } }]"
    :variables="[{ key: 'name', label: 'Name', sample: 'Sara' }]"
    :on-send-test="sendTest"
    :on-send="startSend"
    :progress="progress"
  />
</template>
