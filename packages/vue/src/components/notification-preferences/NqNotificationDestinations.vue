<script setup lang="ts">
import { Mail, Plus, Send, Trash2, Webhook } from "lucide-vue-next";
import { computed, ref } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqConfirmButton } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { destinationProblem, type DestinationKind, type NotificationDestination } from "./notification-rules";
import type { NotificationAddValues, NotificationDestinationResult, NotificationTestResult } from "./types";

// Extra delivery destinations: the list with a test send and a confirmed remove, and the add form. Internal to NqNotificationPreferences.
const props = defineProps<{
  /** The resolved strings. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: Record<string, any>;
  destinations: readonly NotificationDestination[];
  onAdd?: (values: NotificationAddValues) => Promise<NotificationDestinationResult>;
  onRemove?: (destination: NotificationDestination) => Promise<NotificationDestinationResult>;
  onTest?: (destination: NotificationDestination) => Promise<NotificationTestResult>;
}>();

const kind = ref<DestinationKind>("email");
const target = ref("");
const attempted = ref(false);
const serverError = ref<string | null>(null);
const adding = ref(false);
const testing = ref<string | null>(null);
const results = ref<Record<string, { ok: boolean; text: string }>>({});
const error = ref<string | null>(null);

const problem = computed(() => destinationProblem(kind.value, target.value));
const shown = computed(() => serverError.value ?? (attempted.value && problem.value ? props.t.problem[problem.value] : undefined));

async function add() {
  attempted.value = true;
  serverError.value = null;
  if (problem.value || !props.onAdd) return;
  adding.value = true;
  try {
    const result = await props.onAdd({ kind: kind.value, target: target.value.trim() });
    if (result && typeof result === "object" && result.error) serverError.value = result.error;
    else {
      target.value = "";
      attempted.value = false;
    }
  } catch {
    serverError.value = props.t.destFailed;
  } finally {
    adding.value = false;
  }
}

async function test(d: NotificationDestination) {
  testing.value = d.id;
  try {
    const r = await props.onTest!(d);
    results.value = { ...results.value, [d.id]: { ok: r.ok, text: r.ok ? props.t.testOk : (r.message ?? props.t.testFailed) } };
  } catch {
    results.value = { ...results.value, [d.id]: { ok: false, text: props.t.testFailed } };
  } finally {
    testing.value = null;
  }
}

async function remove(d: NotificationDestination) {
  error.value = null;
  try {
    const r = await props.onRemove?.(d);
    if (r && typeof r === "object" && r.error) error.value = r.error;
  } catch {
    error.value = props.t.destFailed;
  }
}

function pickKind(v: string | number | null) {
  if (v) {
    kind.value = v as DestinationKind;
    serverError.value = null;
  }
}
</script>

<template>
  <div class="flex flex-col gap-4" data-slot="notification-destinations">
    <NqAlert v-if="error" tone="danger" dismissible :dismiss-label="t.dismiss" @dismiss="error = null">{{ error }}</NqAlert>
    <ul v-if="destinations.length" class="flex flex-col divide-y divide-border rounded-card border border-border">
      <li v-for="d in destinations" :key="d.id" class="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
        <component :is="d.kind === 'email' ? Mail : Webhook" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
        <div class="flex min-w-0 flex-1 flex-col">
          <bdi dir="ltr" class="truncate text-body-sm text-foreground">{{ d.target }}</bdi>
          <span class="text-caption text-muted-foreground">{{ d.label ?? (d.kind === "email" ? t.destEmail : t.destWebhook) }}</span>
        </div>
        <NqBadge v-if="d.kind === 'email'" :variant="d.verified ? 'success' : 'warning'">{{ d.verified ? t.verified : t.pending }}</NqBadge>
        <NqButton v-if="onTest" size="sm" variant="secondary" :loading="testing === d.id" @click="test(d)">
          <Send class="rtl:-scale-x-100" />
          {{ t.test }}
        </NqButton>
        <NqConfirmButton v-if="onRemove" size="sm" variant="ghost" :title="t.removeTitle(d.target)" :description="t.removeBody" :confirm-label="t.remove" :on-confirm="() => remove(d)">
          <Trash2 />
          {{ t.remove }}
        </NqConfirmButton>
        <p v-if="results[d.id]" role="status" :class="cn('basis-full text-caption', results[d.id]!.ok ? 'text-nq-success-text' : 'text-nq-danger-text')">{{ results[d.id]!.text }}</p>
      </li>
    </ul>
    <p v-else class="text-body-sm text-muted-foreground">{{ t.destEmpty }}</p>
    <form v-if="onAdd" novalidate class="flex flex-col gap-3 sm:flex-row sm:items-start" @submit.prevent="add">
      <NqField class="sm:w-40">
        <NqFieldLabel>{{ t.destKind }}</NqFieldLabel>
        <NqSelect :model-value="kind" @update:model-value="pickKind">
          <NqSelectTrigger :aria-label="t.destKind"><NqSelectValue /></NqSelectTrigger>
          <NqSelectContent>
            <NqSelectItem value="email">{{ t.destEmail }}</NqSelectItem>
            <NqSelectItem value="webhook">{{ t.destWebhook }}</NqSelectItem>
          </NqSelectContent>
        </NqSelect>
      </NqField>
      <NqField :invalid="!!shown" class="flex-1">
        <NqFieldLabel>{{ t.destTarget }}</NqFieldLabel>
        <NqInput
          v-model="target"
          ltr
          autocapitalize="none"
          :spellcheck="false"
          :placeholder="kind === 'email' ? t.destEmailPlaceholder : t.destWebhookPlaceholder"
          :disabled="adding"
          @input="serverError = null"
        />
        <NqFieldError v-if="shown" match>{{ shown }}</NqFieldError>
      </NqField>
      <NqButton type="submit" variant="secondary" :loading="adding" class="sm:mt-6">
        <Plus />
        {{ t.add }}
      </NqButton>
    </form>
  </div>
</template>
