<script setup lang="ts">
import { ChevronRight } from "lucide-vue-next";
import { ref } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { etFrameLocation, type ErrorFrame, type ErrorTrackingLabels } from "./error-tracking-model";

// One line of a stack trace. Frames that have source context expand to show it with the failing line marked.
const props = defineProps<{ frame: ErrorFrame; labels: ErrorTrackingLabels }>();
const open = ref(false);
</script>

<template>
  <li :data-in-app="props.frame.inApp ? 'true' : 'false'" :class="cn('flex flex-col gap-2 px-3 py-2', props.frame.inApp === false && 'opacity-70')">
    <div class="flex flex-wrap items-center gap-2">
      <NqButton v-if="props.frame.context?.length" size="icon-sm" variant="ghost" :aria-expanded="open" :aria-label="open ? props.labels.hideContext : props.labels.showContext" @click="open = !open">
        <ChevronRight aria-hidden="true" :class="cn('transition-transform rtl:-scale-x-100', open && 'rotate-90 rtl:rotate-90')" />
      </NqButton>
      <bdi dir="ltr" class="min-w-0 break-all font-mono text-code text-foreground">
        <span v-if="props.frame.fn" class="font-semibold">{{ props.frame.fn }} </span>
        <span class="text-muted-foreground">{{ etFrameLocation(props.frame) }}</span>
      </bdi>
      <NqBadge :variant="props.frame.inApp ? 'info' : 'neutral'" class="ms-auto">{{ props.frame.inApp ? props.labels.inApp : props.labels.library }}</NqBadge>
    </div>
    <ol v-if="open && props.frame.context?.length" dir="ltr" class="overflow-x-auto rounded-control border border-border bg-muted py-1 font-mono text-code">
      <li v-for="c in props.frame.context" :key="c.line" :data-hot="c.line === props.frame.line ? 'true' : undefined" :class="cn('flex gap-3 px-3', c.line === props.frame.line && 'bg-nq-danger-soft')">
        <span aria-hidden="true" class="w-8 shrink-0 select-none text-end tabular-nums text-muted-foreground">{{ c.line }}</span>
        <code class="whitespace-pre text-foreground">{{ c.code }}</code>
      </li>
    </ol>
  </li>
</template>
