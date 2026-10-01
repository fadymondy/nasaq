<script setup lang="ts">
import { ArrowRightLeft, Ban, Check, CircleCheck, CircleX, Clock, EyeOff, ShieldQuestion, X } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqBadge, type BadgeVariants } from "../badge";
import { NqButton } from "../button";
import { NqCard } from "../card";
import { NqContextMenuItem } from "../context-menu";
import { NqDateTime, NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsTab } from "../tabs";
import {
  approvalStatus,
  canApprove,
  canDecide,
  pendingCount,
  redactArgs,
  sortQueue,
  unmetCriteria,
  type ApprovalItem,
  type ApprovalKind,
  type ApprovalStatus,
} from "./approval-queue-logic";
import { strings, type Labels } from "./approval-queue-strings";
import NqApprovalRejectDialog from "./NqApprovalRejectDialog.vue";
import NqApprovalRowMenu from "./NqApprovalRowMenu.vue";

// A pending-first queue of things waiting for a person to decide: an automation asking to run an action, a
// review with pass/fail criteria, a comment or testimonial to moderate, a customer request. Each item shows
// who asked, when it expires, its arguments with secrets masked, and Approve / Reject / Convert. Rejecting
// asks for a reason. It has no backend: your callbacks decide, then you pass the updated `items` back.
type DecisionResult = void | { error?: string };
type Filter = "pending" | "decided" | "all";

interface Props {
  items: ApprovalItem[];
  /** Approve one item. Reject or return `{ error }` to show a failure and keep the item pending. */
  onApprove: (id: string) => Promise<DecisionResult>;
  /** Reject one item with the reason the reviewer typed (never empty). */
  onReject: (id: string, reason: string) => Promise<DecisionResult>;
  /** Turn an item into something else, such as a task or an order. Omit to hide the button. */
  onConvert?: (id: string) => Promise<DecisionResult>;
  /** Text of the convert button, for example "Convert to task". Default "Convert". */
  convertLabel?: string;
  /** Which tab opens first. Default `pending`. */
  defaultFilter?: Filter;
  /** Reference time for expiry, for tests and stories. Default: now. */
  now?: number;
  title?: string;
  labels?: Labels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { defaultFilter: "pending" });

const nq = useNasaq();
const t = computed(() => ({ ...strings(nq.locale.value), ...props.labels }) as ReturnType<typeof strings>);
const filter = ref<Filter>(props.defaultFilter);
const busyId = ref<string | null>(null);
const errors = ref<Record<string, string>>({});
const rejecting = ref<ApprovalItem | null>(null);
const clock = computed(() => props.now ?? Date.now());

const kindVariant: Record<ApprovalKind, BadgeVariants["variant"]> = { action: "warning", review: "info", moderation: "outline", request: "accent" };
const statusVariant: Record<ApprovalStatus, BadgeVariants["variant"]> = { pending: "warning", approved: "success", rejected: "danger", expired: "neutral", converted: "info" };

const sorted = computed(() => sortQueue(props.items, clock.value));
const waiting = computed(() => pendingCount(props.items, clock.value));
const visible = computed(() =>
  sorted.value.filter((i) => {
    const pending = approvalStatus(i, clock.value) === "pending";
    return filter.value === "all" || (filter.value === "pending" ? pending : !pending);
  }),
);

async function run(id: string, fn: () => Promise<DecisionResult> | undefined): Promise<string | null> {
  busyId.value = id;
  const { [id]: _drop, ...rest } = errors.value;
  errors.value = rest;
  let message: string | null = null;
  try {
    const result = await fn();
    if (result && typeof result === "object" && result.error) message = result.error;
  } catch {
    message = t.value.failed;
  }
  busyId.value = null;
  if (message) errors.value = { ...errors.value, [id]: message };
  return message;
}

async function submitReject(id: string, reason: string) {
  const err = await run(id, () => props.onReject(id, reason));
  if (!err) rejecting.value = null;
  return err;
}
</script>

<template>
  <section data-slot="approval-queue" :aria-label="props.title ?? t.title" :class="cn('flex flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-body-sm text-muted-foreground" aria-live="polite">
        {{ waiting > 0 ? t.waiting(waiting) : t.nothingWaiting }}
      </p>
      <NqTabs :model-value="filter" @update:model-value="(v: string | number) => (filter = v as Filter)">
        <NqTabsList :aria-label="t.filter">
          <NqTabsTab value="pending">
            {{ t.pending }}
            <NqNum v-if="waiting > 0" :value="waiting" class="text-caption text-muted-foreground" />
          </NqTabsTab>
          <NqTabsTab value="decided">{{ t.decided }}</NqTabsTab>
          <NqTabsTab value="all">{{ t.all }}</NqTabsTab>
          <NqTabsIndicator />
        </NqTabsList>
      </NqTabs>
    </div>

    <NqEmptyState
      v-if="visible.length === 0"
      :icon="filter === 'pending' ? CircleCheck : ShieldQuestion"
      :title="filter === 'pending' ? t.emptyPending : t.emptyTitle"
      :description="filter === 'pending' ? t.emptyPendingBody : t.emptyBody"
    />
    <ul v-else :aria-label="t.list" class="flex flex-col gap-3">
      <li v-for="item in visible" :key="item.id">
        <NqApprovalRowMenu :enabled="canDecide(item, clock)">
          <template #menu>
            <NqContextMenuItem :disabled="!canApprove(item, clock) || busyId === item.id" @select="run(item.id, () => props.onApprove(item.id))">
              <Check aria-hidden="true" />
              {{ t.approve }}
            </NqContextMenuItem>
            <NqContextMenuItem :disabled="busyId === item.id" @select="rejecting = item">
              <Ban aria-hidden="true" />
              {{ t.reject }}
            </NqContextMenuItem>
            <NqContextMenuItem v-if="props.onConvert" :disabled="busyId === item.id" @select="run(item.id, () => props.onConvert?.(item.id))">
              <ArrowRightLeft aria-hidden="true" />
              {{ props.convertLabel ?? t.convert }}
            </NqContextMenuItem>
          </template>
          <NqCard data-slot="approval-item" :data-status="approvalStatus(item, clock)" :data-kind="item.kind" class="gap-3 p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex min-w-0 flex-1 flex-col gap-1">
                <div class="flex flex-wrap items-center gap-2">
                  <NqBadge :variant="kindVariant[item.kind]">{{ t.kind[item.kind] }}</NqBadge>
                  <NqBadge :variant="statusVariant[approvalStatus(item, clock)]">{{ t.status[approvalStatus(item, clock)] }}</NqBadge>
                  <NqBadge v-if="item.criteria && item.criteria.length > 0" :variant="unmetCriteria(item).length === 0 ? 'success' : 'danger'">
                    <Check v-if="unmetCriteria(item).length === 0" aria-hidden="true" />
                    <X v-else aria-hidden="true" />
                    {{ unmetCriteria(item).length === 0 ? t.pass : t.fail }}
                  </NqBadge>
                </div>
                <h3 class="text-label text-foreground">{{ item.title }}</h3>
                <p v-if="item.description" class="text-body-sm text-muted-foreground">{{ item.description }}</p>
              </div>
              <dl class="flex flex-col gap-0.5 text-caption text-muted-foreground sm:items-end">
                <div v-if="item.requester" class="flex gap-1">
                  <dt>{{ t.by }}</dt>
                  <dd class="text-foreground">{{ item.requester }}</dd>
                </div>
                <div class="flex gap-1">
                  <dt>{{ t.requested }}</dt>
                  <dd><NqDateTime :value="item.createdAt" relative /></dd>
                </div>
                <div
                  v-if="item.expiresAt !== undefined && (approvalStatus(item, clock) === 'pending' || approvalStatus(item, clock) === 'expired')"
                  :class="cn('flex items-center gap-1', approvalStatus(item, clock) === 'expired' && 'text-nq-danger-text')"
                >
                  <Clock aria-hidden="true" class="size-3" />
                  <dt>{{ approvalStatus(item, clock) === "expired" ? t.expired : t.expires }}</dt>
                  <dd><NqDateTime :value="item.expiresAt" relative /></dd>
                </div>
              </dl>
            </div>

            <blockquote v-if="item.quote" class="border-s-2 border-border ps-3 text-body-sm text-foreground">{{ item.quote }}</blockquote>

            <div v-if="redactArgs(item.args, item.redact).length > 0" class="flex flex-col gap-1.5">
              <p class="text-caption text-muted-foreground">{{ t.args }}</p>
              <dl class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 rounded-control border border-border bg-secondary/50 p-2.5">
                <div v-for="a in redactArgs(item.args, item.redact)" :key="a.key" class="contents">
                  <dt dir="ltr" class="text-start font-mono text-caption text-muted-foreground">{{ a.key }}</dt>
                  <dd dir="ltr" :class="cn('flex min-w-0 items-center gap-1 break-words text-start font-mono text-caption', a.redacted ? 'text-muted-foreground' : 'text-foreground')">
                    <EyeOff v-if="a.redacted" :aria-label="t.redacted" class="size-3 shrink-0" />
                    {{ a.value }}
                  </dd>
                </div>
              </dl>
            </div>

            <div v-if="item.criteria && item.criteria.length > 0" class="flex flex-col gap-1.5">
              <p class="text-caption text-muted-foreground">{{ t.criteria }}{{ unmetCriteria(item).length > 0 ? ` · ${t.unmet(unmetCriteria(item).length)}` : "" }}</p>
              <ul class="flex flex-col gap-1">
                <li v-for="c in item.criteria" :key="c.id" class="flex items-center gap-2 text-body-sm">
                  <CircleCheck v-if="c.met" :aria-label="t.pass" class="size-4 shrink-0 text-nq-success-text" />
                  <CircleX v-else :aria-label="t.fail" class="size-4 shrink-0 text-nq-danger-text" />
                  <span :class="cn(!c.met && 'text-nq-danger-text')">{{ c.label }}</span>
                </li>
              </ul>
            </div>

            <p v-if="approvalStatus(item, clock) !== 'pending' && (item.reason || item.decidedBy)" class="flex flex-wrap gap-x-3 text-body-sm text-muted-foreground">
              <span v-if="item.decidedBy">
                {{ t.decidedBy }} <span class="text-foreground">{{ item.decidedBy }}</span>
                <template v-if="item.decidedAt !== undefined">{{ " " }}<NqDateTime :value="item.decidedAt" relative /></template>
              </span>
              <span v-if="item.reason">
                {{ t.reason }}: <span class="text-foreground">{{ item.reason }}</span>
              </span>
            </p>

            <NqAlert v-if="errors[item.id]" tone="danger">{{ errors[item.id] }}</NqAlert>

            <div v-if="canDecide(item, clock)" class="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <NqButton
                variant="primary"
                size="sm"
                :disabled="!canApprove(item, clock)"
                :loading="busyId === item.id"
                :aria-label="t.approveFor(item.title)"
                :title="canApprove(item, clock) ? undefined : t.blocked"
                @click="run(item.id, () => props.onApprove(item.id))"
              >
                <Check aria-hidden="true" />
                {{ t.approve }}
              </NqButton>
              <NqButton variant="secondary" size="sm" :disabled="busyId === item.id" :aria-label="t.rejectFor(item.title)" @click="rejecting = item">
                <Ban aria-hidden="true" />
                {{ t.reject }}
              </NqButton>
              <NqButton v-if="props.onConvert" variant="ghost" size="sm" :disabled="busyId === item.id" :aria-label="t.convertFor(item.title)" @click="run(item.id, () => props.onConvert?.(item.id))">
                <ArrowRightLeft aria-hidden="true" />
                {{ props.convertLabel ?? t.convert }}
              </NqButton>
              <span v-if="!canApprove(item, clock)" class="text-caption text-nq-danger-text">{{ t.blocked }}</span>
            </div>
          </NqCard>
        </NqApprovalRowMenu>
      </li>
    </ul>

    <NqApprovalRejectDialog :item="rejecting" :t="t" :on-submit="submitReject" @cancel="rejecting = null" />
  </section>
</template>
