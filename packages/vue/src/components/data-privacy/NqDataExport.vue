<script setup lang="ts">
import { CircleAlert, CircleCheck, Clock, Download, FileArchive, RefreshCw } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqSettingsSection } from "../account-settings";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { formatFileSize } from "../file-upload";
import { NqDateTime } from "../numeric";
import { NqProgress } from "../progress";
import { isExportActive, pollDelay, type ExportStatus } from "./privacy-rules";
import { dataPrivacyStrings, type DataPrivacyLabels } from "./strings";
import type { DataExportRequest, DataExportResult } from "./types";

// Request a copy of your data and follow it until it is ready. While the export is queued or processing the screen asks
// `poll` on a timer that backs off, and shows progress when it is known; after three failed checks it stops and offers
// to check again. Ready exports show the size, the expiry and a Download button.
interface Props {
  /** The latest export, or `null` if none was requested. */
  request: DataExportRequest | null;
  /** Ask for a new export. Resolve `{ request }` or `{ error }`. */
  onRequest: () => Promise<DataExportResult>;
  /** Fetch the current state of an export. Called on a backing-off timer while it is queued or processing. */
  poll?: (id: string) => Promise<DataExportRequest>;
  /** Called with every new state, so the host can store it. */
  onChange?: (request: DataExportRequest) => void;
  /** Start the download, for example by opening a signed URL. */
  onDownload?: (request: DataExportRequest) => void | Promise<void>;
  /** What the file contains, as short lines. */
  includes?: readonly string[];
  /** First delay between polls in ms. Default 3000. Grows by half each time up to 30 seconds. */
  pollInterval?: number;
  labels?: DataPrivacyLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { poll: undefined, onChange: undefined, onDownload: undefined, includes: undefined, pollInterval: 3000, labels: undefined });

const nq = useNasaq();
const t = computed(() => ({ ...dataPrivacyStrings(nq.locale.value), ...props.labels }));
const current = ref<DataExportRequest | null>(props.request);
const busy = ref<"request" | "download" | null>(null);
const error = ref<string | null>(null);
const stalled = ref(false);
const nudge = ref(0);
watch(
  () => props.request,
  (r) => (current.value = r),
);

const TONE: Record<ExportStatus, "info" | "success" | "danger" | "neutral"> = { queued: "info", processing: "info", ready: "success", failed: "danger", expired: "neutral" };
const active = computed(() => (current.value && isExportActive(current.value.status) ? current.value.id : null));

watch(
  [active, () => props.pollInterval, nudge] as const,
  ([id, interval], _old, onCleanup) => {
    if (!id || !props.poll) return;
    let stop = false;
    let attempt = 0;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout>;
    stalled.value = false;
    const tick = () => {
      timer = setTimeout(async () => {
        try {
          const next = await props.poll!(id);
          if (stop) return;
          failures = 0;
          current.value = next;
          props.onChange?.(next);
          if (isExportActive(next.status)) {
            attempt += 1;
            tick();
          }
        } catch {
          if (stop) return;
          failures += 1;
          if (failures >= 3) stalled.value = true;
          else {
            attempt += 1;
            tick();
          }
        }
      }, pollDelay(attempt, interval));
    };
    tick();
    onCleanup(() => {
      stop = true;
      clearTimeout(timer);
    });
  },
  { immediate: true },
);

async function ask() {
  busy.value = "request";
  error.value = null;
  try {
    const r = await props.onRequest();
    if (r.error !== undefined) error.value = r.error;
    else {
      current.value = r.request;
      props.onChange?.(r.request);
    }
  } catch {
    error.value = t.value.requestFailed;
  } finally {
    busy.value = null;
  }
}

async function download() {
  if (!current.value) return;
  busy.value = "download";
  error.value = null;
  try {
    await props.onDownload?.(current.value);
  } catch {
    error.value = t.value.downloadFailed;
  } finally {
    busy.value = null;
  }
}

const status = computed(() => current.value?.status);
</script>

<template>
  <NqSettingsSection data-slot="data-export" :data-status="status ?? 'none'" :title="t.exportTitle" :description="t.exportBody" :class="props.class">
    <template v-if="!current || status === 'failed' || status === 'expired'" #actions>
      <NqButton variant="primary" :loading="busy === 'request'" @click="ask">
        <FileArchive />
        {{ current ? t.requestAgain : t.request }}
      </NqButton>
    </template>
    <div class="flex flex-col gap-4">
      <div v-if="props.includes?.length" class="flex flex-col gap-1.5">
        <span class="text-label text-foreground">{{ t.includes }}</span>
        <ul class="list-disc ps-5 text-body-sm text-muted-foreground">
          <li v-for="i in props.includes" :key="i">{{ i }}</li>
        </ul>
      </div>

      <NqAlert v-if="error" tone="danger" role="alert" dismissible @dismiss="error = null">{{ error }}</NqAlert>

      <div v-if="current" class="flex flex-col gap-3 rounded-card border border-border p-4" data-slot="data-export-status">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2" role="status" aria-live="polite">
            <NqBadge :variant="TONE[current.status]">
              <CircleCheck v-if="current.status === 'ready'" aria-hidden="true" />
              <CircleAlert v-else-if="current.status === 'failed'" aria-hidden="true" />
              <Clock v-else-if="current.status === 'expired'" aria-hidden="true" />
              <RefreshCw v-else aria-hidden="true" class="motion-safe:animate-spin" />
              {{ t.status[current.status] }}
            </NqBadge>
          </div>
          <NqButton v-if="current.status === 'ready' && props.onDownload" variant="primary" :loading="busy === 'download'" @click="download">
            <Download />
            {{ t.download }}
            <span v-if="current.sizeBytes" class="opacity-80">
              (<bdi dir="ltr">{{ formatFileSize(current.sizeBytes, nq.locale.value) }}</bdi>)
            </span>
          </NqButton>
        </div>

        <template v-if="isExportActive(current.status)">
          <NqProgress :value="current.progress !== undefined ? Math.round(current.progress * 100) : null" :aria-label="t.progressLabel" size="sm" />
          <p class="text-caption text-muted-foreground">{{ t.emailNote }}</p>
        </template>
        <p v-if="current.status === 'failed'" class="text-body-sm text-nq-danger-text">{{ t.failedBody }}</p>
        <p v-if="current.status === 'expired'" class="text-body-sm text-muted-foreground">{{ t.expiredBody }}</p>
        <NqAlert v-if="stalled" tone="warning">
          {{ t.checkFailed }}
          <template #action>
            <NqButton size="sm" variant="secondary" @click="nudge += 1">{{ t.retryCheck }}</NqButton>
          </template>
        </NqAlert>

        <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1 text-body-sm">
          <dt class="text-muted-foreground">{{ t.requestedAt }}</dt>
          <dd><NqDateTime :value="current.requestedAt" :format="{ dateStyle: 'medium', timeStyle: 'short' }" /></dd>
          <template v-if="current.completedAt && current.status === 'ready'">
            <dt class="text-muted-foreground">{{ t.readyAt }}</dt>
            <dd><NqDateTime :value="current.completedAt" :format="{ dateStyle: 'medium', timeStyle: 'short' }" /></dd>
          </template>
          <template v-if="current.expiresAt && current.status === 'ready'">
            <dt class="text-muted-foreground">{{ t.expiresAt }}</dt>
            <dd><NqDateTime :value="current.expiresAt" :format="{ dateStyle: 'medium' }" /></dd>
          </template>
        </dl>
      </div>
    </div>
  </NqSettingsSection>
</template>
