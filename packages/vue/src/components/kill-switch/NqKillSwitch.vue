<script setup lang="ts">
import { CirclePause, CirclePlay, Globe, OctagonX, ShieldAlert, Unplug } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle, NqConfirmButton } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqContextMenu, NqContextMenuContent, NqContextMenuItem, NqContextMenuTrigger } from "../context-menu";
import { NqDateTime, NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import NqPauseDialog from "./NqPauseDialog.vue";
import { strings, type KillSwitchLabels } from "./strings";
import type { KillSwitchResult, PairedBrowser, PauseInfo } from "./types";

// One switch to stop every automation, with a required reason, and a confirmed resume. While paused it shows
// who stopped it, when and why. An optional list of paired browsers lets you unpair one you do not
// recognise. Pair it with NqPausedBanner on every page. No backend: your callbacks do the work.
interface Props {
  /** `null` when automations run. The pause details when the emergency stop is on. */
  paused: PauseInfo | null;
  /** How many automations are active, shown while running. */
  activeCount?: number;
  /** Stop everything. `reason` is never empty. Reject or return `{ error }` to keep the dialog open. */
  onStopAll: (reason: string) => Promise<KillSwitchResult>;
  /** Resume everything, after the confirm. */
  onResume: () => Promise<KillSwitchResult>;
  /** Paired browsers. Omit to hide the list. */
  browsers?: PairedBrowser[];
  onUnpairBrowser?: (id: string) => Promise<KillSwitchResult>;
  labels?: KillSwitchLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { activeCount: undefined, browsers: undefined, onUnpairBrowser: undefined, labels: undefined });

const nq = useNasaq();
const t = computed(() => ({ ...strings(nq.locale.value), ...props.labels }));
const dialog = ref(false);
const unpairing = ref<PairedBrowser | null>(null);
const unpairBusy = ref(false);
const error = ref<string | null>(null);
const isPaused = computed(() => props.paused !== null);
const onlineCount = computed(() => (props.browsers ?? []).filter((b) => b.online).length);

async function guard(fn: () => Promise<KillSwitchResult>) {
  error.value = null;
  let message: string | null = null;
  try {
    const r = await fn();
    if (r && typeof r === "object" && r.error) message = r.error;
  } catch {
    message = t.value.failed;
  }
  if (message) {
    error.value = message;
    throw new Error(message);
  }
}

async function unpair() {
  if (!unpairing.value || !props.onUnpairBrowser) return;
  const id = unpairing.value.id;
  unpairBusy.value = true;
  try {
    await guard(() => props.onUnpairBrowser!(id));
    unpairing.value = null;
  } catch {
    // The message is already shown above the list; the dialog stays open to retry.
  }
  unpairBusy.value = false;
}

const canUnpair = (b: PairedBrowser) => Boolean(props.onUnpairBrowser) && !b.current;
</script>

<template>
  <section data-slot="kill-switch" :data-paused="isPaused" :aria-label="t.title" :class="cn('flex flex-col gap-4', props.class)">
    <NqCard :class="cn(isPaused && 'border-nq-danger/40')">
      <NqCardHeader>
        <NqCardTitle as="h2" class="flex items-center gap-2">
          <CirclePause v-if="isPaused" aria-hidden="true" class="size-4 text-nq-danger-text" />
          <ShieldAlert v-else aria-hidden="true" class="size-4 text-muted-foreground" />
          {{ t.title }}
        </NqCardTitle>
        <NqCardDescription>{{ t.description }}</NqCardDescription>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-4">
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <template v-if="props.paused">
          <NqAlert tone="danger" :title="t.paused">
            <span class="block">{{ t.pausedBy(props.paused.by) }}, <NqDateTime :value="props.paused.at" relative /></span>
            <span class="block text-foreground">{{ t.reason }}: {{ props.paused.reason }}</span>
          </NqAlert>
          <div>
            <NqConfirmButton variant="primary" :title="t.resumeTitle" :description="t.resumeBody" :confirm-label="t.resumeConfirm" :cancel-label="t.cancel" :on-confirm="() => guard(props.onResume)">
              <CirclePlay aria-hidden="true" />
              {{ t.resume }}
            </NqConfirmButton>
          </div>
        </template>
        <template v-else>
          <div class="flex items-center gap-2 text-body-sm text-muted-foreground">
            <NqBadge variant="success">{{ t.running }}</NqBadge>
            <span v-if="props.activeCount !== undefined">{{ t.runningCount(props.activeCount) }}</span>
          </div>
          <div>
            <NqButton variant="danger" @click="dialog = true">
              <OctagonX aria-hidden="true" />
              {{ t.stopAll }}
            </NqButton>
          </div>
        </template>
      </NqCardContent>
    </NqCard>

    <NqCard v-if="props.browsers">
      <NqCardHeader>
        <NqCardTitle as="h2">{{ t.browsersTitle }}</NqCardTitle>
        <NqCardDescription>{{ t.browsersBody }}</NqCardDescription>
      </NqCardHeader>
      <NqCardContent>
        <NqEmptyState v-if="props.browsers.length === 0" :icon="Unplug" :title="t.browsersEmpty" :description="t.browsersEmptyBody" />
        <ul v-else class="flex flex-col divide-y divide-border rounded-control border border-border">
          <template v-for="b in props.browsers" :key="b.id">
            <NqContextMenu v-if="canUnpair(b)">
              <NqContextMenuTrigger as="li" class="flex flex-wrap items-center gap-3 p-3">
                <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-muted-foreground [&_svg]:size-4"><Globe aria-hidden="true" /></span>
                <div class="flex min-w-0 flex-1 flex-col">
                  <span class="flex flex-wrap items-center gap-2 text-label text-foreground">
                    {{ b.name }}
                    <NqBadge v-if="b.current" variant="brand">{{ t.thisBrowser }}</NqBadge>
                  </span>
                  <span class="text-caption text-muted-foreground">
                    {{ b.device ? `${b.device} · ` : "" }}
                    <template v-if="b.online">{{ t.online }}</template>
                    <template v-else-if="b.lastSeen !== undefined">{{ t.lastSeen }} <NqDateTime :value="b.lastSeen" relative /></template>
                    <template v-else>{{ t.offline }}</template>
                  </span>
                </div>
                <span aria-hidden="true" :class="cn('size-2 rounded-full', b.online ? 'bg-nq-success' : 'bg-nq-line-strong')" />
                <NqButton size="sm" variant="secondary" :aria-label="t.unpairFor(b.name)" @click="unpairing = b">{{ t.unpair }}</NqButton>
              </NqContextMenuTrigger>
              <NqContextMenuContent>
                <NqContextMenuItem variant="danger" @select="unpairing = b">
                  <Unplug aria-hidden="true" />
                  {{ t.unpair }}
                </NqContextMenuItem>
              </NqContextMenuContent>
            </NqContextMenu>
            <li v-else class="flex flex-wrap items-center gap-3 p-3">
              <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-muted-foreground [&_svg]:size-4"><Globe aria-hidden="true" /></span>
              <div class="flex min-w-0 flex-1 flex-col">
                <span class="flex flex-wrap items-center gap-2 text-label text-foreground">
                  {{ b.name }}
                  <NqBadge v-if="b.current" variant="brand">{{ t.thisBrowser }}</NqBadge>
                </span>
                <span class="text-caption text-muted-foreground">
                  {{ b.device ? `${b.device} · ` : "" }}
                  <template v-if="b.online">{{ t.online }}</template>
                  <template v-else-if="b.lastSeen !== undefined">{{ t.lastSeen }} <NqDateTime :value="b.lastSeen" relative /></template>
                  <template v-else>{{ t.offline }}</template>
                </span>
              </div>
              <span aria-hidden="true" :class="cn('size-2 rounded-full', b.online ? 'bg-nq-success' : 'bg-nq-line-strong')" />
            </li>
          </template>
        </ul>
        <p v-if="props.browsers.length > 0" class="mt-2 text-caption text-muted-foreground"><NqNum :value="onlineCount" /> / <NqNum :value="props.browsers.length" /> {{ t.online }}</p>
      </NqCardContent>
    </NqCard>

    <NqAlertDialog :open="unpairing !== null" @update:open="(o: boolean) => !o && !unpairBusy && (unpairing = null)">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ unpairing ? t.unpairTitle(unpairing.name) : "" }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.unpairBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel :disabled="unpairBusy">{{ t.cancel }}</NqAlertDialogCancel>
          <NqButton variant="danger" :loading="unpairBusy" @click="unpair">{{ t.unpair }}</NqButton>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
    <NqPauseDialog :open="dialog" :t="t" :on-pause="props.onStopAll" @close="dialog = false" />
  </section>
</template>
