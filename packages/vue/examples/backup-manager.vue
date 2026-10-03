<script setup lang="ts">
import { NqBackupManager, type BackupRecord } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const backups = ref<BackupRecord[]>([
  { id: "b1", createdAt: Date.now() - 3600_000, sizeBytes: 12_400_000, kind: "scheduled", status: "completed" },
  { id: "b2", createdAt: Date.now() - 26 * 3600_000, sizeBytes: 11_900_000, kind: "manual", status: "completed", name: "Before the migration" },
]);
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 500));
const run = async () => {
  await wait();
  backups.value = [{ id: `b${Date.now()}`, createdAt: Date.now(), sizeBytes: 12_500_000, kind: "manual", status: "completed" }, ...backups.value];
};
</script>

<template>
  <NqBackupManager
    :backups="backups"
    :schedule="{ enabled: true, frequency: 'daily', time: '02:30' }"
    :retention="{ keepLast: 14, maxAgeDays: 60 }"
    :on-run-now="run"
    :on-restore="wait"
    :on-save-schedule="wait"
    :on-delete="async (id: string) => { await wait(); backups = backups.filter((b) => b.id !== id); }"
  />
</template>
