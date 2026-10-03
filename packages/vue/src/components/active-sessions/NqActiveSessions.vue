<script setup lang="ts">
import { Laptop, LogOut, MonitorSmartphone, Smartphone, Tablet } from "lucide-vue-next";
import { computed, ref, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqConfirmButton } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDateTime } from "../numeric";
import { NqEmptyState } from "../states";
import { STRINGS, type ActiveSession, type ActiveSessionsLabels, type RevokeResult, type SessionDeviceKind } from "./strings";

// The devices signed in to an account, the current one first and marked, with sign out per device and for every other
// device. It only draws the list; your callbacks end the sessions on the server.
interface Props {
  sessions: readonly ActiveSession[];
  /** Shows "Sign out" on every other session. Throw or return `{ error }` to keep it. */
  onRevoke?: (id: string) => Promise<RevokeResult>;
  /** Shows "Sign out other devices" in the header when there is more than one session. */
  onRevokeOthers?: () => Promise<RevokeResult>;
  labels?: Partial<ActiveSessionsLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { onRevoke: undefined, onRevokeOthers: undefined, labels: undefined });

const KIND_ICON: Record<SessionDeviceKind, Component> = { desktop: Laptop, mobile: Smartphone, tablet: Tablet, other: MonitorSmartphone };

const nq = useNasaq();
const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const error = ref<string | null>(null);
const sorted = computed(() => [...props.sessions].sort((a, b) => Number(!!b.current) - Number(!!a.current)));
const others = computed(() => props.sessions.filter((s) => !s.current).length);

async function run(action: () => Promise<RevokeResult>) {
  error.value = null;
  try {
    const result = await action();
    if (result && result.error) {
      error.value = result.error;
      throw new Error(result.error);
    }
  } catch (e) {
    error.value ??= e instanceof Error ? e.message : String(e);
    throw e;
  }
}
</script>

<template>
  <NqCard data-slot="active-sessions" :class="cn('w-full max-w-2xl', props.class)">
    <NqCardHeader>
      <NqCardTitle as="h2">{{ t.title }}</NqCardTitle>
      <NqCardDescription>{{ t.description }}</NqCardDescription>
      <NqCardAction v-if="props.onRevokeOthers && others > 0">
        <NqConfirmButton
          size="sm"
          variant="secondary"
          :title="t.signOutOthersTitle"
          :description="t.signOutOthersBody"
          :confirm-label="t.signOutOthers"
          :on-confirm="() => run(props.onRevokeOthers!)"
        >
          <span class="inline-flex items-center gap-2"><LogOut aria-hidden="true" /> {{ t.signOutOthers }}</span>
        </NqConfirmButton>
      </NqCardAction>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-3">
      <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
      <ul v-if="sorted.length" :aria-label="t.list" class="overflow-hidden rounded-card border border-border">
        <li
          v-for="s in sorted"
          :key="s.id"
          data-slot="session-row"
          :data-current="s.current ? '' : undefined"
          class="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3 first:border-t-0"
        >
          <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-muted-foreground [&_svg]:size-4">
            <component :is="KIND_ICON[s.kind ?? 'other']" aria-hidden="true" />
          </span>
          <div class="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
            <p class="flex items-center gap-2 text-label text-foreground">
              <span class="truncate" :title="s.device ?? t.unknownDevice">{{ s.device ?? t.unknownDevice }}</span>
              <NqBadge v-if="s.current" variant="success">{{ t.current }}</NqBadge>
            </p>
            <p class="flex flex-wrap gap-x-2 text-caption text-muted-foreground">
              <span v-if="s.location">{{ s.location }}</span>
              <span v-if="s.ip" dir="ltr" class="font-mono">{{ s.ip }}</span>
              <span>{{ t.lastActive }} <NqDateTime :value="s.lastActiveAt" relative /></span>
            </p>
          </div>
          <NqConfirmButton
            v-if="props.onRevoke && !s.current"
            size="sm"
            variant="ghost"
            :title="t.signOutTitle"
            :description="t.signOutBody"
            :confirm-label="t.signOut"
            :on-confirm="() => run(() => props.onRevoke!(s.id))"
          >
            {{ t.signOut }}<span class="sr-only">: {{ s.device ?? t.unknownDevice }}</span>
          </NqConfirmButton>
        </li>
      </ul>
      <NqEmptyState v-else :icon="MonitorSmartphone" :title="t.emptyTitle" :description="t.emptyBody" />
    </NqCardContent>
  </NqCard>
</template>
