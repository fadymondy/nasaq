<script setup lang="ts">
import { NqAccountDeletion, NqCancelDeletionPage, NqDataPrivacy, type DataExportRequest } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

// A frozen clock keeps the countdown the same on every render.
const now = new Date(2026, 8, 29, 9, 0, 0);
const latest = ref<DataExportRequest>({
  id: "exp_1",
  status: "ready",
  requestedAt: new Date(2026, 8, 28, 9, 0, 0),
  completedAt: new Date(2026, 8, 28, 9, 12, 0),
  expiresAt: new Date(2026, 9, 5, 9, 0, 0),
  sizeBytes: 48_300_000,
});
const scheduled = new Date(2026, 9, 14, 9, 0, 0);
const noop = async () => undefined;
</script>

<template>
  <div class="flex flex-col gap-10">
    <NqDataPrivacy
      :data-export="{
        request: latest,
        onRequest: async () => ({ request: { ...latest, id: 'exp_2', status: 'queued' as const } }),
        onDownload: noop,
        includes: ['Profile', 'Activity', 'Files'],
      }"
      :deletion="{ scheduledFor: null, graceDays: 30, confirmText: 'sara@sahab.studio', onSchedule: noop, onCancel: noop, now }"
    />
    <NqAccountDeletion :scheduled-for="scheduled" :grace-days="30" confirm-text="sara@sahab.studio" :on-schedule="noop" :on-cancel="noop" :now="now" />
    <NqCancelDeletionPage
      bare
      state="ready"
      :account="{ name: 'Sara Haddad', email: 'sara@sahab.studio' }"
      :scheduled-for="scheduled"
      :on-cancel-deletion="noop"
    />
  </div>
</template>
