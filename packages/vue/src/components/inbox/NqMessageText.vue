<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { splitByQuery } from "./inbox-format";

// Message text with `dir="auto"`, clickable links and find-in-thread highlights. `query` marks matches with a <mark>;
// `current` is which match inside this message is the current one (0-based), or -1.
const props = withDefaults(defineProps<{ text: string; query?: string; current?: number; class?: HTMLAttributes["class"] }>(), { current: -1 });
const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/gi;

const finding = computed(() => Boolean(props.query?.trim()));
const links = computed(() => props.text.split(URL_RE).map((part, i) => ({ part, link: i % 2 === 1 })));
const runs = computed(() => {
  let n = -1;
  return splitByQuery(props.text, props.query ?? "").map((run) => {
    if (run.match) n += 1;
    return { ...run, nth: run.match ? n : -1 };
  });
});
const href = (part: string) => part.replace(/[.,;:!?؟،]+$/, "");
</script>

<template>
  <p dir="auto" :class="cn('whitespace-pre-wrap text-start [overflow-wrap:anywhere]', props.class)">
    <template v-if="finding">
      <template v-for="(run, i) in runs" :key="i">
        <mark
          v-if="run.match"
          :data-find-current="run.nth === props.current || undefined"
          :class="['rounded-[2px] px-0.5 text-foreground', run.nth === props.current ? 'bg-nq-accent/60 outline outline-1 outline-nq-accent' : 'bg-nq-accent/25']"
          >{{ run.text }}</mark
        >
        <template v-else>{{ run.text }}</template>
      </template>
    </template>
    <template v-else>
      <template v-for="(p, i) in links" :key="i">
        <a v-if="p.link" :href="href(p.part)" target="_blank" rel="noopener noreferrer" dir="ltr" class="underline decoration-nq-line-strong underline-offset-4 hover:decoration-current">{{ p.part }}</a>
        <template v-else>{{ p.part }}</template>
      </template>
    </template>
  </p>
</template>
