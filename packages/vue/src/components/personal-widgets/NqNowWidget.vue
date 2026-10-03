<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { formatDate } from "../numeric";
import { fill, usePersonalStrings, type PersonalWidgetLabels } from "./strings";
import type { NowItem } from "./types";

// A "now" page in a card: what the owner is building, reading and learning at the moment.
interface Props {
  items: NowItem[];
  /** When the list was last edited. */
  updated?: Date | number | string;
  title?: string;
  labels?: PersonalWidgetLabels;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const { t, locale } = usePersonalStrings(() => props.labels);
</script>

<template>
  <NqCard data-slot="now-widget" :class="cn('gap-3', props.class)">
    <NqCardHeader>
      <NqCardTitle>{{ props.title ?? t.now }}</NqCardTitle>
      <p v-if="props.updated" class="text-caption text-muted-foreground">{{ fill(t.updated, { date: formatDate(props.updated, locale, { dateStyle: "medium" }) }) }}</p>
    </NqCardHeader>
    <NqCardContent>
      <dl class="flex flex-col gap-2.5">
        <div v-for="i in props.items" :key="i.label" class="flex flex-col gap-0.5">
          <dt class="text-caption text-muted-foreground">{{ i.label }}</dt>
          <dd dir="auto" class="text-body-sm text-foreground">
            <a v-if="i.href" :href="i.href" class="underline decoration-nq-line-strong underline-offset-4 hover:decoration-current">{{ i.text }}</a>
            <template v-else>{{ i.text }}</template>
          </dd>
        </div>
      </dl>
    </NqCardContent>
  </NqCard>
</template>
