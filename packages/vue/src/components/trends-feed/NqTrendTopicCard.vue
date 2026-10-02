<script setup lang="ts">
import { ChevronDown, CircleAlert, Ellipsis, ExternalLink, Flame } from "lucide-vue-next";
import { ref } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent } from "../card";
import { NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger } from "../collapsible";
import { NqContextMenuActions, openContextMenuAt, type ContextMenuAction } from "../context-menu";
import { formatRelativeTime, NqNum } from "../numeric";
import { ACTION_ICONS } from "./icons";
import type { TrendsFeedLabels } from "./strings";
import { actionsFor, type TrendAction } from "./trends-feed-math";
import type { TrendTopic } from "./types";

// One topic of NqTrendsFeed: title, score and reasons, outlets, a collapsible article list, actions and a context menu.
interface Props {
  topic: TrendTopic;
  t: TrendsFeedLabels;
  now: Date;
  hot: boolean;
  pending: boolean;
  error?: string;
  menu: ContextMenuAction[];
  canAct: boolean;
}
const props = defineProps<Props>();
const emit = defineEmits<{ run: [action: TrendAction] }>();
const nq = useNasaq();
const open = ref(false);
</script>

<template>
  <NqContextMenuActions :actions="props.menu" as="li" class="min-w-0">
    <NqCard class="w-full">
      <NqCardContent class="flex flex-col gap-3 pt-4">
        <div class="flex items-start gap-3">
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <h4 class="text-body font-medium">{{ props.topic.title }}</h4>
            <p v-if="props.topic.summary" class="text-body-sm text-muted-foreground">{{ props.topic.summary }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <NqBadge v-if="props.hot" variant="danger"><Flame aria-hidden="true" />{{ props.t.hot }}</NqBadge>
            <NqBadge variant="outline">{{ props.t.score }} <NqNum :value="props.topic.score" /></NqBadge>
          </div>
        </div>
        <div v-if="props.topic.reasons?.length">
          <p class="text-caption font-medium text-muted-foreground">{{ props.t.why }}</p>
          <ul class="mt-1 list-disc ps-5 text-body-sm">
            <li v-for="r in props.topic.reasons" :key="r">{{ r }}</li>
          </ul>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-caption text-muted-foreground">{{ props.t.outlets(props.topic.outlets.length) }}</span>
          <NqBadge v-for="o in props.topic.outlets" :key="o.id" variant="neutral">{{ o.name }}</NqBadge>
        </div>
        <NqCollapsible v-model:open="open">
          <NqCollapsibleTrigger as-child>
            <NqButton variant="ghost" size="sm" class="-ms-2">
              <ChevronDown aria-hidden="true" :class="cn('transition-transform motion-reduce:transition-none', open && 'rotate-180')" />
              {{ open ? props.t.hideItems : props.t.showItems(props.topic.items.length) }}
            </NqButton>
          </NqCollapsibleTrigger>
          <NqCollapsiblePanel>
            <ul class="mt-2 flex flex-col divide-y divide-border rounded-control border border-border">
              <li v-for="it in props.topic.items" :key="it.id" class="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div class="min-w-0">
                  <a v-if="it.url" :href="it.url" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1 text-body-sm font-medium underline-offset-2 hover:underline">
                    {{ it.title }}
                    <ExternalLink aria-hidden="true" class="size-3 rtl:-scale-x-100" />
                    <span class="sr-only">{{ props.t.open }}</span>
                  </a>
                  <span v-else class="text-body-sm font-medium">{{ it.title }}</span>
                  <p class="text-caption text-muted-foreground">{{ it.outlet }} · {{ formatRelativeTime(it.publishedAt, nq.locale.value, { now: props.now }) }}</p>
                </div>
              </li>
            </ul>
          </NqCollapsiblePanel>
        </NqCollapsible>
        <p v-if="props.error" role="alert" class="flex items-center gap-1.5 text-body-sm text-nq-danger-text">
          <CircleAlert aria-hidden="true" class="size-4" />
          {{ props.error }}
        </p>
        <div v-if="props.canAct" class="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <NqButton
            v-for="a in actionsFor(props.topic.state)"
            :key="a"
            :variant="a === 'dismiss' ? 'ghost' : 'secondary'"
            size="sm"
            :loading="props.pending"
            :disabled="props.pending"
            @click="emit('run', a)"
          >
            <component :is="ACTION_ICONS[a]" aria-hidden="true" />
            {{ props.t.actions[a] }}
          </NqButton>
          <NqButton variant="ghost" size="icon-sm" class="ms-auto" :aria-label="props.t.moreFor(props.topic.title)" @click="(e: MouseEvent) => openContextMenuAt((e.currentTarget as HTMLElement).closest('li') as HTMLElement)">
            <Ellipsis aria-hidden="true" />
          </NqButton>
        </div>
      </NqCardContent>
    </NqCard>
  </NqContextMenuActions>
</template>
