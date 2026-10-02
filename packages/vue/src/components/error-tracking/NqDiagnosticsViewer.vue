<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { formatNumber, NqDateTime } from "../numeric";
import { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow } from "../table";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { ERROR_TRACKING_STRINGS, etFormatDuration, etHttpTone, type ErrorDiagnostics, type ErrorTrackingLabels } from "./error-tracking-model";

// The screenshot, console output and network requests captured with an error, in three tabs.
interface Props {
  diagnostics: ErrorDiagnostics;
  labels?: Partial<ErrorTrackingLabels>;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => ({ ...ERROR_TRACKING_STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }) as ErrorTrackingLabels);
const num = (n: number) => formatNumber(n, locale.value);

const failedOnly = ref(false);
const net = computed(() => props.diagnostics.network ?? []);
const shown = computed(() => (failedOnly.value ? net.value.filter((r) => etHttpTone(r.status) === "danger" || etHttpTone(r.status) === "warning") : net.value));
const first = computed(() => (props.diagnostics.screenshot ? "screenshot" : props.diagnostics.console?.length ? "console" : "network"));
</script>

<template>
  <NqTabs data-slot="diagnostics-viewer" :default-value="first" :class="cn('gap-3', props.class)">
    <NqTabsList>
      <NqTabsTab value="screenshot">{{ t.screenshot }}</NqTabsTab>
      <NqTabsTab value="console">
        {{ t.console }} <bdi class="text-caption tabular-nums opacity-70">{{ num(props.diagnostics.console?.length ?? 0) }}</bdi>
      </NqTabsTab>
      <NqTabsTab value="network">
        {{ t.network }} <bdi class="text-caption tabular-nums opacity-70">{{ num(net.length) }}</bdi>
      </NqTabsTab>
      <NqTabsIndicator />
    </NqTabsList>
    <NqTabsPanel value="screenshot">
      <figure v-if="props.diagnostics.screenshot" class="overflow-hidden rounded-card border border-border bg-muted">
        <img :src="props.diagnostics.screenshot" :alt="t.screenshotAlt" class="block h-auto w-full" />
      </figure>
      <p v-else class="text-body-sm text-muted-foreground">{{ t.noScreenshot }}</p>
    </NqTabsPanel>
    <NqTabsPanel value="console">
      <ul v-if="props.diagnostics.console?.length" dir="ltr" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card font-mono text-code">
        <li v-for="(c, i) in props.diagnostics.console" :key="i" :data-level="c.level" class="flex items-start gap-3 px-3 py-1.5">
          <span class="shrink-0 tabular-nums text-muted-foreground"><NqDateTime :value="c.at" :format="{ timeStyle: 'medium' }" /></span>
          <NqBadge :variant="c.level === 'error' ? 'danger' : c.level === 'warn' ? 'warning' : 'neutral'" class="shrink-0">{{ c.level }}</NqBadge>
          <span class="min-w-0 whitespace-pre-wrap break-words text-foreground">{{ c.message }}</span>
        </li>
      </ul>
      <p v-else class="text-body-sm text-muted-foreground">{{ t.noConsole }}</p>
    </NqTabsPanel>
    <NqTabsPanel value="network" class="flex flex-col gap-2">
      <template v-if="net.length">
        <div class="flex gap-2">
          <NqButton size="sm" :variant="failedOnly ? 'secondary' : 'primary'" :aria-pressed="!failedOnly" @click="failedOnly = false">{{ t.allRequests }}</NqButton>
          <NqButton size="sm" :variant="failedOnly ? 'primary' : 'secondary'" :aria-pressed="failedOnly" @click="failedOnly = true">{{ t.failedOnly }}</NqButton>
        </div>
        <NqTable :label="t.network">
          <NqTableHeader>
            <NqTableRow>
              <NqTableHead>{{ t.method }}</NqTableHead>
              <NqTableHead>{{ t.url }}</NqTableHead>
              <NqTableHead>{{ t.status }}</NqTableHead>
              <NqTableHead class="text-end">{{ t.duration }}</NqTableHead>
            </NqTableRow>
          </NqTableHeader>
          <NqTableBody>
            <NqTableRow v-for="(r, i) in shown" :key="i">
              <NqTableCell><bdi dir="ltr" class="font-mono text-code">{{ r.method }}</bdi></NqTableCell>
              <NqTableCell class="max-w-72 truncate"><bdi dir="ltr" class="font-mono text-code" :title="r.url">{{ r.url }}</bdi></NqTableCell>
              <NqTableCell>
                <NqBadge :variant="etHttpTone(r.status)"><bdi>{{ r.status ? r.status : "—" }}</bdi></NqBadge>
              </NqTableCell>
              <NqTableCell class="text-end tabular-nums"><bdi>{{ r.duration === undefined ? "—" : etFormatDuration(r.duration) }}</bdi></NqTableCell>
            </NqTableRow>
          </NqTableBody>
        </NqTable>
      </template>
      <p v-else class="text-body-sm text-muted-foreground">{{ t.noNetwork }}</p>
    </NqTabsPanel>
  </NqTabs>
</template>
