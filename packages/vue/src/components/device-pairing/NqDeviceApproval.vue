<script setup lang="ts">
import { Ban, Check, TimerOff } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { useAuthLocale, type AuthSubmitResult } from "../auth-layout";
import { formatCountdown } from "../auth-layout/auth-utils";
import { NqButton } from "../button";
import { NqCard } from "../card";
import { formatDate } from "../numeric";
import { codeSecondsLeft, effectiveCodeStatus, formatUserCode, type DeviceCodeStatus } from "./device-code";
import { STRINGS, type DevicePairingLabels, type DeviceRequest } from "./strings";
import { useCountdownClock } from "./use-now";

// The page a signed-in person lands on to approve a device: the big code to compare, what is asking (device, platform, IP,
// place, time, scopes), a warning, and Approve or Deny. It shows the outcome afterwards, and turns to "expired" by itself.
interface Props {
  request: DeviceRequest;
  /** `pending` asks for a decision. The others are the outcome. A pending request past `expiresAt` shows as expired. Default `pending`. */
  status?: DeviceCodeStatus;
  /** When the code stops working. Shows a countdown. */
  expiresAt?: Date | number | string;
  /** The signed-in account, so the person knows whose access they are granting. */
  account?: { name: string; email?: string };
  onApprove: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  onDeny: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** On the expired screen: go back to code entry. */
  onEnterAnother?: () => void;
  labels?: Partial<DevicePairingLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { status: "pending", expiresAt: undefined, account: undefined, onEnterAnother: undefined, labels: undefined });
const locale = useAuthLocale();
const t = computed<DevicePairingLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
const { locale: nasaqLocale } = useNasaq();
const now = useCountdownClock(() => props.expiresAt);
const shown = computed(() => effectiveCodeStatus(props.status, props.expiresAt, now.value));
const pending = ref<"approve" | "deny" | null>(null);
const error = ref<string | undefined>();
let alive = true;
onBeforeUnmount(() => (alive = false));

async function decide(kind: "approve" | "deny") {
  if (pending.value) return;
  pending.value = kind;
  error.value = undefined;
  try {
    const result = await (kind === "approve" ? props.onApprove() : props.onDeny());
    if (result?.error && alive) error.value = result.error;
  } catch {
    if (alive) error.value = t.value.failed;
  } finally {
    if (alive) pending.value = null;
  }
}

const outcome = computed(() => {
  const s = shown.value;
  return {
    icon: s === "approved" ? Check : s === "denied" ? Ban : TimerOff,
    tone: s === "approved" ? "bg-nq-success-soft text-nq-success-text" : s === "denied" ? "bg-nq-danger-soft text-nq-danger-text" : "bg-muted text-muted-foreground",
    title: s === "approved" ? t.value.approvedTitle : s === "denied" ? t.value.deniedTitle : t.value.expiredTitle,
    body: s === "approved" ? t.value.approvedDescription : s === "denied" ? t.value.deniedDescription : t.value.expiredDescription,
  };
});
const left = computed(() => (props.expiresAt !== undefined ? codeSecondsLeft(props.expiresAt, now.value) : undefined));
const rows = computed(() => {
  const r = props.request;
  return [
    { key: "device", label: t.value.device, text: r.deviceName, mono: false },
    { key: "platform", label: t.value.platform, text: r.platform, mono: false },
    { key: "browser", label: t.value.browser, text: r.browser, mono: false },
    { key: "ip", label: t.value.ip, text: r.ip, mono: true },
    { key: "location", label: t.value.location, text: r.location, mono: false },
    { key: "requested", label: t.value.requested, text: r.requestedAt !== undefined ? formatDate(r.requestedAt, String(nasaqLocale.value), { dateStyle: "medium", timeStyle: "short" }) : undefined, mono: false },
  ].filter((row) => row.text);
});
</script>

<template>
  <NqCard v-if="shown !== 'pending'" data-slot="device-approval" :data-status="shown" role="status" :class="cn('mx-auto w-full max-w-md items-center gap-4 p-8 text-center', props.class)">
    <span :class="cn('inline-flex size-12 items-center justify-center rounded-full', outcome.tone)">
      <component :is="outcome.icon" aria-hidden="true" class="size-6" />
    </span>
    <h1 class="text-h2 text-foreground">{{ outcome.title }}</h1>
    <p class="text-body-sm text-muted-foreground">{{ outcome.body }}</p>
    <NqButton v-if="shown === 'expired' && onEnterAnother" variant="primary" @click="onEnterAnother()">{{ t.another }}</NqButton>
  </NqCard>
  <NqCard v-else data-slot="device-approval" data-status="pending" :aria-busy="pending !== null || undefined" :class="cn('mx-auto w-full max-w-md gap-5 p-6 sm:p-8', props.class)">
    <header class="flex flex-col gap-1.5">
      <h1 class="text-h2 text-foreground">{{ t.approveTitle }}</h1>
      <p class="text-body-sm text-muted-foreground">{{ fill(t.approveDescription, { client: request.client }) }}</p>
      <p v-if="account" class="text-caption text-muted-foreground">{{ fill(t.signedInAs, { name: account.email ? `${account.name} (${account.email})` : account.name }) }}</p>
    </header>
    <div class="flex flex-col items-center gap-1 rounded-card border border-border bg-muted/50 py-4">
      <span class="text-caption text-muted-foreground">{{ t.code }}</span>
      <span data-slot="device-code" dir="ltr" class="font-mono text-h1 tracking-[0.12em] text-foreground">{{ formatUserCode(request.code) }}</span>
      <span v-if="left !== undefined" dir="ltr" class="text-caption text-muted-foreground tabular-nums">{{ fill(t.expiresIn, { time: formatCountdown(left) }) }}</span>
    </div>
    <dl class="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body-sm">
      <div v-for="row in rows" :key="row.key" class="col-span-2 grid grid-cols-subgrid">
        <dt class="text-muted-foreground">{{ row.label }}</dt>
        <dd class="m-0 text-start text-foreground">
          <bdi v-if="row.mono" dir="ltr" class="font-mono">{{ row.text }}</bdi>
          <template v-else>{{ row.text }}</template>
        </dd>
      </div>
    </dl>
    <div v-if="request.scopes?.length" class="flex flex-col gap-1.5">
      <p class="text-label text-foreground">{{ t.scopes }}</p>
      <ul class="m-0 flex list-disc flex-col gap-0.5 ps-5 text-body-sm text-muted-foreground">
        <li v-for="scope in request.scopes" :key="scope">{{ scope }}</li>
      </ul>
    </div>
    <NqAlert tone="warning">{{ t.warning }}</NqAlert>
    <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <NqButton variant="secondary" size="lg" :loading="pending === 'deny'" :disabled="pending === 'approve'" @click="decide('deny')">{{ t.deny }}</NqButton>
      <NqButton variant="primary" size="lg" :loading="pending === 'approve'" :disabled="pending === 'deny'" @click="decide('approve')">{{ t.approve }}</NqButton>
    </div>
  </NqCard>
</template>
