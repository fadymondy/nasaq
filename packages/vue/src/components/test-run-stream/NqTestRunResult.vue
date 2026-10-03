<script setup lang="ts">
import { ExternalLink } from "lucide-vue-next";
import { ref, useId } from "vue";
import { NqButton } from "../button";
import { NqCodeBlock } from "../code-block";
import type { TestRunStreamLabels } from "./labels";
import type { TestRunResult } from "./test-run-stream-logic";

// One thing the run kept: a title (linked when there is a url), a few facts, a preview and its raw data behind a toggle.
const props = defineProps<{ result: TestRunResult; t: TestRunStreamLabels }>();
const open = ref(false);
const rawId = useId();
const title = () => props.result.title || props.result.url || props.t.untitled;
</script>

<template>
  <li data-slot="test-run-result" :data-result="props.result.id" class="flex flex-col gap-1.5 p-3">
    <div class="flex min-w-0 items-start gap-2">
      <a
        v-if="props.result.url"
        :href="props.result.url"
        target="_blank"
        rel="noopener noreferrer"
        dir="auto"
        class="min-w-0 flex-1 truncate text-label text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current"
      >
        {{ title() }}
        <ExternalLink aria-hidden="true" class="ms-1 inline size-3.5 align-[-2px] text-muted-foreground" />
        <span class="sr-only"> {{ props.t.opensNewTab }}</span>
      </a>
      <span v-else dir="auto" class="min-w-0 flex-1 truncate text-label text-foreground">{{ title() }}</span>
    </div>
    <div v-if="props.result.meta?.length" class="flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground">
      <bdi v-for="(m, i) in props.result.meta" :key="i">{{ m }}</bdi>
    </div>
    <p v-if="props.result.body" dir="auto" class="line-clamp-3 text-body-sm text-muted-foreground">{{ props.result.body }}</p>
    <div v-if="props.result.raw !== undefined" class="flex flex-col gap-2">
      <NqButton size="sm" variant="link" :aria-expanded="open" :aria-controls="rawId" class="w-fit" @click="open = !open">
        {{ open ? props.t.hideRaw : props.t.showRaw }}
      </NqButton>
      <div v-if="open" :id="rawId">
        <NqCodeBlock :code="JSON.stringify(props.result.raw, null, 2)" language="json" :filename="props.t.raw" pre-class-name="max-h-64" />
      </div>
    </div>
  </li>
</template>
