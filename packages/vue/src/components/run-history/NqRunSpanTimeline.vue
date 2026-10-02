<script setup lang="ts">
import { CircleAlert } from "lucide-vue-next";
import { computed, ref } from "vue";
import { cn } from "../../lib/cn";
import type { RunHistoryLabels } from "./labels";
import { formatRunDuration, orderSpans, type RunSpan } from "./run-model";

// The trace: spans as a waterfall on one time axis; choose one for its details and attributes.
const props = defineProps<{ spans: RunSpan[]; t: RunHistoryLabels; ar: boolean }>();
const selected = ref<string | null>(null);
const ordered = computed(() => orderSpans(props.spans));
const origin = computed(() => Math.min(...props.spans.map((s) => s.startMs)));
const extent = computed(() => Math.max(1, Math.max(...props.spans.map((s) => s.startMs + s.durationMs)) - origin.value));
const chosen = computed(() => props.spans.find((s) => s.id === selected.value));
const geo = (s: RunSpan) => {
  const left = ((s.startMs - origin.value) / extent.value) * 100;
  const width = Math.max(0.8, (s.durationMs / extent.value) * 100);
  return { left, width };
};
const dur = (ms: number) => formatRunDuration(ms, props.ar);
</script>

<template>
  <div class="flex flex-col gap-3">
    <section :aria-label="props.t.waterfall" data-slot="run-trace" class="rounded-control border border-border p-3">
      <ul class="flex flex-col gap-1">
        <li v-for="{ span: s, depth } in ordered" :key="s.id">
          <button
            type="button"
            :aria-pressed="s.id === selected"
            :class="cn('grid w-full grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 rounded-control px-1 py-0.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus sm:grid-cols-[minmax(0,14rem)_1fr]', s.id === selected && 'bg-nq-selected')"
            @click="selected = s.id === selected ? null : s.id"
          >
            <span class="min-w-0" :style="{ paddingInlineStart: `${depth * 0.75}rem` }">
              <bdi dir="ltr" class="block truncate font-mono text-code text-foreground">
                <CircleAlert v-if="s.error" aria-hidden="true" class="me-1 inline size-3.5 text-nq-danger-text" />
                {{ s.name }}
              </bdi>
              <span v-if="s.service" dir="ltr" class="block truncate text-caption text-muted-foreground">{{ s.service }}</span>
            </span>
            <span class="relative h-5 rounded-control bg-nq-surface-soft" role="img" :aria-label="`${s.name}, ${dur(s.durationMs)}${s.error ? `, ${props.t.spanFailed}` : ''}`">
              <span :class="cn('absolute inset-y-0.5 rounded-[3px]', s.error ? 'bg-destructive' : 'bg-primary')" :style="{ insetInlineStart: `${geo(s).left}%`, width: `${Math.min(geo(s).width, 100 - geo(s).left)}%` }" />
              <span class="absolute inset-y-0 flex items-center text-caption text-foreground tabular-nums" :style="{ insetInlineStart: `${Math.min(geo(s).left + geo(s).width + 1, 78)}%` }" dir="ltr">{{ dur(s.durationMs) }}</span>
            </span>
          </button>
        </li>
      </ul>
    </section>
    <section :aria-label="props.t.spanDetail" aria-live="polite" data-slot="run-span-detail" class="rounded-control border border-border p-3">
      <div v-if="chosen" class="flex flex-col gap-3">
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
          <dt class="text-muted-foreground">{{ props.t.spanName }}</dt>
          <dd dir="ltr" class="font-mono text-code">{{ chosen.name }}</dd>
          <template v-if="chosen.service">
            <dt class="text-muted-foreground">{{ props.t.spanService }}</dt>
            <dd dir="ltr">{{ chosen.service }}</dd>
          </template>
          <dt class="text-muted-foreground">{{ props.t.spanStart }}</dt>
          <dd dir="ltr">{{ dur(chosen.startMs) }}</dd>
          <dt class="text-muted-foreground">{{ props.t.spanDuration }}</dt>
          <dd dir="ltr">{{ dur(chosen.durationMs) }}</dd>
          <template v-if="chosen.error">
            <dt class="text-muted-foreground">{{ props.t.error }}</dt>
            <dd class="text-nq-danger-text">{{ props.t.spanFailed }}</dd>
          </template>
        </dl>
        <div>
          <p class="mb-1 text-label text-foreground">{{ props.t.spanAttrs }}</p>
          <dl v-if="chosen.attributes && Object.keys(chosen.attributes).length" class="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-control bg-nq-surface-soft p-2 text-code" dir="ltr">
            <div v-for="(v, k) in chosen.attributes" :key="k" class="contents">
              <dt class="font-mono text-muted-foreground">{{ k }}</dt>
              <dd class="min-w-0 break-words font-mono text-foreground">{{ String(v) }}</dd>
            </div>
          </dl>
          <p v-else class="text-body-sm text-muted-foreground">{{ props.t.spanNoAttrs }}</p>
        </div>
      </div>
      <p v-else class="text-body-sm text-muted-foreground">{{ props.t.pickSpan }}</p>
    </section>
  </div>
</template>
