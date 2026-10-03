<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqAccountDeletion from "./NqAccountDeletion.vue";
import NqDataExport from "./NqDataExport.vue";
import type { DataExportRequest, DataExportResult, PrivacyDate } from "./types";
import type { DataPrivacyLabels } from "./strings";

// The privacy page of account settings: export your data, then delete your account with a grace period.
interface Props {
  dataExport: {
    request: DataExportRequest | null;
    onRequest: () => Promise<DataExportResult>;
    poll?: (id: string) => Promise<DataExportRequest>;
    onChange?: (request: DataExportRequest) => void;
    onDownload?: (request: DataExportRequest) => void | Promise<void>;
    includes?: readonly string[];
    pollInterval?: number;
    labels?: DataPrivacyLabels;
  };
  deletion: {
    scheduledFor?: PrivacyDate | null;
    graceDays?: number;
    confirmText: string;
    onSchedule: () => Promise<void | { scheduledFor?: PrivacyDate }>;
    onCancel: () => Promise<void | { error?: string }>;
    now?: Date;
    labels?: DataPrivacyLabels;
  };
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
</script>

<template>
  <div data-slot="data-privacy" :class="cn('flex flex-col gap-6', props.class)">
    <NqDataExport v-bind="props.dataExport" />
    <NqAccountDeletion v-bind="props.deletion" />
  </div>
</template>
