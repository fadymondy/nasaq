<script setup lang="ts">
import { Camera, Cpu, Ellipsis, HardDrive, History, MemoryStick, Play, Power, PowerOff, RotateCw, SlidersHorizontal, Trash2 } from "lucide-vue-next";
import { computed, ref, type Component } from "vue";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogAction, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqSparkline } from "../chart";
import { NqContextMenu, NqContextMenuContent, NqContextMenuItem, NqContextMenuTrigger } from "../context-menu";
import { NqCopyButton } from "../copy-button";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuItem, NqDropdownMenuTrigger } from "../dropdown-menu";
import { NqDateTime } from "../numeric";
import { NqStatus, type StatusTone } from "../status";
import { NqSkeleton } from "../states";
import NqServerLimitsDialog from "./NqServerLimitsDialog.vue";
import NqServerMeter from "./NqServerMeter.vue";
import NqServerSnapshotDialog from "./NqServerSnapshotDialog.vue";
import { clampPercent, formatDisk, formatMemory, isTransitional, powerActionsFor, type PowerAction, type ServerLimits, type ServerStatus } from "./server-format";
import { serverCardStrings, type ServerCardLabels } from "./strings";
import type { ServerCardResult, ServerInfo, ServerSnapshot } from "./types";

// One server: status and address, hardware, live CPU, memory and disk meters with a CPU trend, the last deploy,
// power controls that depend on the state (stopping and force-stopping ask first), snapshots with take, roll back
// and delete (also on context-click), and a resource limits editor. Presentational: your callbacks talk to the
// provider and you pass the updated `server` back.
interface Props {
  server: ServerInfo;
  loading?: boolean;
  /** Run a power action, after the confirm for stop and force stop. Resolve `{ error }` to show a message. */
  onPower: (action: PowerAction) => Promise<ServerCardResult>;
  /** Take a snapshot. `name` is empty when the user left it blank. Shows the button when set. */
  onTakeSnapshot?: (name: string) => Promise<ServerCardResult>;
  /** Roll the disk back to a snapshot, after the confirm. */
  onRollback?: (snapshotId: string) => Promise<ServerCardResult>;
  onDeleteSnapshot?: (snapshotId: string) => Promise<ServerCardResult>;
  /** Save new resource limits. Shows the limits editor button when set. */
  onSaveLimits?: (limits: ServerLimits) => Promise<ServerCardResult>;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: ServerCardLabels;
}
const props = withDefaults(defineProps<Props>(), { loading: false, onTakeSnapshot: undefined, onRollback: undefined, onDeleteSnapshot: undefined, onSaveLimits: undefined, labels: undefined });

type Pending = { kind: "power"; action: PowerAction } | { kind: "rollback"; snap: ServerSnapshot } | { kind: "delete"; snap: ServerSnapshot };

const statusTone: Record<ServerStatus, StatusTone> = { running: "success", stopped: "neutral", starting: "info", stopping: "info", restarting: "info", provisioning: "info", suspended: "warning", error: "danger" };
const powerIcon: Record<PowerAction, Component> = { start: Play, stop: Power, restart: RotateCw, "force-stop": PowerOff };
const deployBadge = { success: "success", failed: "danger", running: "info" } as const;

const nq = useNasaq();
const t = computed(() => serverCardStrings(nq.locale.value, props.labels));
const error = ref<string | null>(null);
const pending = ref<Pending | null>(null);
const confirmOpen = ref(false);
const busy = ref(false);
const snapOpen = ref(false);
const limitsOpen = ref(false);

async function run(fn: () => Promise<ServerCardResult>) {
  busy.value = true;
  error.value = null;
  try {
    const result = await fn();
    if (result && result.error) error.value = result.error;
  } catch {
    error.value = t.value.genericError;
  } finally {
    busy.value = false;
  }
}

const actions = computed(() => powerActionsFor(props.server.status));
const transitional = computed(() => isTransitional(props.server.status));
const metrics = computed(() => props.server.metrics);
const live = computed(() => !!metrics.value && (props.server.status === "running" || props.server.status === "error"));

const confirmCopy = computed(() => {
  const p = pending.value;
  if (!p) return null;
  return p.kind === "power"
    ? { title: t.value.powerConfirmTitle(t.value.powerActions[p.action], props.server.name), body: t.value.powerConfirmBody[p.action], confirm: t.value.powerActions[p.action] }
    : p.kind === "rollback"
      ? { title: t.value.rollbackTitle(p.snap.name), body: t.value.rollbackBody, confirm: t.value.rollback }
      : { title: t.value.removeTitle(p.snap.name), body: t.value.removeBody, confirm: t.value.remove };
});

function ask(next: Pending) {
  pending.value = next;
  confirmOpen.value = true;
}

function requestPower(action: PowerAction) {
  if (action === "start" || action === "restart") void run(() => props.onPower(action));
  else ask({ kind: "power", action });
}

function confirmPending() {
  const p = pending.value;
  confirmOpen.value = false;
  if (!p) return;
  if (p.kind === "power") void run(() => props.onPower(p.action));
  else if (p.kind === "rollback" && props.onRollback) void run(() => props.onRollback!(p.snap.id));
  else if (p.kind === "delete" && props.onDeleteSnapshot) void run(() => props.onDeleteSnapshot!(p.snap.id));
}

interface MenuItem {
  id: "rollback" | "delete";
  label: string;
  icon: Component;
  danger: boolean;
  run: () => void;
}
function itemsFor(s: ServerSnapshot): MenuItem[] {
  const creating = s.status === "creating";
  const out: MenuItem[] = [];
  if (props.onRollback && !creating) out.push({ id: "rollback", label: t.value.rollback, icon: History, danger: false, run: () => ask({ kind: "rollback", snap: s }) });
  if (props.onDeleteSnapshot && !creating) out.push({ id: "delete", label: t.value.remove, icon: Trash2, danger: true, run: () => ask({ kind: "delete", snap: s }) });
  return out;
}

const meters = computed(() => {
  const m = metrics.value;
  if (!m) return [];
  return [
    { key: "cpu", label: t.value.cpu, icon: Cpu, value: m.cpu },
    { key: "memory", label: t.value.memory, icon: MemoryStick, value: m.memory },
    { key: "disk", label: t.value.disk, icon: HardDrive, value: m.disk },
  ];
});
</script>

<template>
  <NqCard v-if="props.loading" data-slot="server-card" aria-busy="true" :aria-label="t.loading">
    <NqCardHeader>
      <NqSkeleton class="h-5 w-40" />
      <NqSkeleton class="h-4 w-56" />
    </NqCardHeader>
    <NqCardContent class="grid gap-3">
      <NqSkeleton class="h-8 w-full" />
      <NqSkeleton class="h-8 w-full" />
      <NqSkeleton class="h-8 w-full" />
    </NqCardContent>
  </NqCard>
  <NqCard v-else data-slot="server-card" :data-status="props.server.status" class="w-full">
    <NqCardHeader class="gap-1.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <NqCardTitle as="h3" class="min-w-0 truncate" dir="auto">{{ props.server.name }}</NqCardTitle>
        <NqStatus :tone="statusTone[props.server.status]" tinted aria-live="polite">{{ t.status[props.server.status] }}</NqStatus>
      </div>
      <NqCardDescription class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span class="inline-flex items-center gap-1">
          <bdi dir="ltr" class="font-mono text-body-sm tabular-nums">{{ props.server.address }}</bdi>
          <NqCopyButton :value="props.server.address" size="icon-sm" variant="ghost" :label="t.copyAddress" />
        </span>
        <span v-if="props.server.region" dir="auto">{{ props.server.region }}</span>
        <bdi v-if="props.server.os" dir="ltr">{{ props.server.os }}</bdi>
      </NqCardDescription>
    </NqCardHeader>

    <NqCardContent class="grid gap-5">
      <NqAlert v-if="error" tone="danger" dismissible @dismiss="error = null">{{ error }}</NqAlert>

      <ul class="flex flex-wrap gap-2" :aria-label="t.hardware">
        <li>
          <NqBadge variant="outline"><Cpu aria-hidden="true" /> <bdi>{{ t.cores(props.server.limits.cpuCores) }}</bdi></NqBadge>
        </li>
        <li>
          <NqBadge variant="outline"><MemoryStick aria-hidden="true" /> <bdi dir="ltr">{{ formatMemory(props.server.limits.memoryMb) }}</bdi></NqBadge>
        </li>
        <li>
          <NqBadge variant="outline"><HardDrive aria-hidden="true" /> <bdi dir="ltr">{{ formatDisk(props.server.limits.diskGb) }}</bdi></NqBadge>
        </li>
      </ul>

      <section :aria-label="t.usage" class="grid gap-3">
        <div v-if="live && metrics" class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div class="grid gap-3">
            <NqServerMeter v-for="m in meters" :key="m.key" :label="m.label" :value="clampPercent(m.value)" size="sm">
              <template #label>
                <span class="inline-flex items-center gap-1.5"><component :is="m.icon" aria-hidden="true" class="size-3.5" />{{ m.label }}</span>
              </template>
              <template #value><bdi dir="ltr">{{ Math.round(m.value) }}%</bdi></template>
            </NqServerMeter>
          </div>
          <NqSparkline v-if="metrics.cpuHistory && metrics.cpuHistory.length > 1" :data="metrics.cpuHistory" :label="t.cpuTrend(props.server.name)" class="h-12 w-full sm:w-40" />
        </div>
        <p v-else class="text-body-sm text-muted-foreground">{{ t.noMetrics }}</p>
      </section>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">
        <span class="text-muted-foreground">{{ t.lastDeploy }}</span>
        <template v-if="props.server.lastDeploy">
          <NqBadge :variant="deployBadge[props.server.lastDeploy.status]">{{ t.deployStatus[props.server.lastDeploy.status] }}</NqBadge>
          <bdi dir="ltr" class="font-mono text-caption">{{ props.server.lastDeploy.ref }}</bdi>
          <NqDateTime :value="props.server.lastDeploy.at" relative class="text-muted-foreground" />
          <span v-if="props.server.lastDeploy.by" class="text-muted-foreground">{{ t.by(props.server.lastDeploy.by) }}</span>
        </template>
        <span v-else class="text-muted-foreground">{{ t.noDeploy }}</span>
      </div>

      <section :aria-label="t.power" class="flex flex-wrap items-center gap-2" data-slot="server-power">
        <NqButton v-for="a in actions" :key="a" type="button" size="sm" :variant="a === 'force-stop' ? 'danger' : a === 'start' ? 'primary' : 'secondary'" :disabled="busy" @click="requestPower(a)">
          <component :is="powerIcon[a]" aria-hidden="true" />
          {{ t.powerActions[a] }}
        </NqButton>
        <span v-if="transitional" class="text-body-sm text-muted-foreground">{{ t.status[props.server.status] }}…</span>
        <span class="flex-1" />
        <NqButton v-if="props.onSaveLimits" type="button" size="sm" variant="ghost" @click="limitsOpen = true">
          <SlidersHorizontal aria-hidden="true" />
          {{ t.limits }}
        </NqButton>
      </section>

      <section v-if="props.onTakeSnapshot || props.server.snapshots.length" :aria-labelledby="`${props.server.id}-snaps`" class="grid gap-2 border-t border-border pt-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="min-w-0">
            <h4 :id="`${props.server.id}-snaps`" class="text-label text-foreground">{{ t.snapshots }}</h4>
            <p class="text-body-sm text-muted-foreground">{{ t.snapshotsBody }}</p>
          </div>
          <NqButton v-if="props.onTakeSnapshot" type="button" size="sm" variant="secondary" :disabled="busy" @click="snapOpen = true">
            <Camera aria-hidden="true" />
            {{ t.takeSnapshot }}
          </NqButton>
        </div>
        <p v-if="props.server.snapshots.length === 0" class="rounded-control border border-dashed border-border p-3 text-body-sm text-muted-foreground">{{ t.snapshotsEmpty }}</p>
        <ul v-else class="grid gap-1.5">
          <NqContextMenu v-for="s in props.server.snapshots" :key="s.id">
            <NqContextMenuTrigger
              as="li"
              tabindex="0"
              data-slot="server-snapshot"
              class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-border px-3 py-2 outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
            >
              <span class="min-w-0 flex-1 truncate text-label text-foreground" dir="auto" :title="s.name">{{ s.name }}</span>
              <NqBadge v-if="s.status === 'creating'" variant="info">{{ t.snapshotCreating }}</NqBadge>
              <bdi v-if="s.sizeLabel" dir="ltr" class="text-caption tabular-nums text-muted-foreground">{{ s.sizeLabel }}</bdi>
              <NqDateTime :value="s.createdAt" relative class="text-caption text-muted-foreground" />
              <NqDropdownMenu v-if="itemsFor(s).length">
                <NqDropdownMenuTrigger as-child>
                  <NqButton variant="ghost" size="icon-sm" :aria-label="t.actionsFor(s.name)" class="text-muted-foreground">
                    <Ellipsis aria-hidden="true" />
                  </NqButton>
                </NqDropdownMenuTrigger>
                <NqDropdownMenuContent align="end" class="min-w-40">
                  <NqDropdownMenuItem v-for="i in itemsFor(s)" :key="i.id" :variant="i.danger ? 'danger' : 'default'" @select="i.run()">
                    <component :is="i.icon" aria-hidden="true" />
                    {{ i.label }}
                  </NqDropdownMenuItem>
                </NqDropdownMenuContent>
              </NqDropdownMenu>
            </NqContextMenuTrigger>
            <NqContextMenuContent v-if="itemsFor(s).length" class="min-w-40">
              <NqContextMenuItem v-for="i in itemsFor(s)" :key="i.id" :variant="i.danger ? 'danger' : 'default'" @select="i.run()">
                <component :is="i.icon" aria-hidden="true" />
                {{ i.label }}
              </NqContextMenuItem>
            </NqContextMenuContent>
          </NqContextMenu>
        </ul>
      </section>
    </NqCardContent>

    <NqAlertDialog :open="confirmOpen" @update:open="confirmOpen = $event">
      <NqAlertDialogContent>
        <template v-if="confirmCopy">
          <NqAlertDialogHeader>
            <NqAlertDialogTitle>{{ confirmCopy.title }}</NqAlertDialogTitle>
            <NqAlertDialogDescription>{{ confirmCopy.body }}</NqAlertDialogDescription>
          </NqAlertDialogHeader>
          <NqAlertDialogFooter>
            <NqAlertDialogCancel>{{ t.cancel }}</NqAlertDialogCancel>
            <NqAlertDialogAction @click="confirmPending()">{{ confirmCopy.confirm }}</NqAlertDialogAction>
          </NqAlertDialogFooter>
        </template>
      </NqAlertDialogContent>
    </NqAlertDialog>

    <NqServerSnapshotDialog v-if="props.onTakeSnapshot" v-model:open="snapOpen" :t="t" :on-create="(name) => run(() => props.onTakeSnapshot!(name))" />
    <NqServerLimitsDialog v-if="props.onSaveLimits" v-model:open="limitsOpen" :limits="props.server.limits" :t="t" :on-save="(l) => run(() => props.onSaveLimits!(l))" />
  </NqCard>
</template>
