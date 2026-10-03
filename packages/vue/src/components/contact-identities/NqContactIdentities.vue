<script setup lang="ts">
import { BadgeCheck, Copy, Link2, Plus, Star, Trash2 } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogAction, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState } from "../states";
import { NqSwitch } from "../switch";
import NqContactConsentStatusText from "./NqContactConsentStatusText.vue";
import {
  CONTACT_CHANNELS,
  CONTACT_CONSENT_CHANNELS,
  contactIdentityKey,
  sortContactIdentities,
  validateContactIdentity,
  type ContactChannel,
  type ContactIdentityIssue,
} from "./contact-identities-logic";
import { useContactIdentitiesLabels, type ContactIdentitiesLabelOverrides } from "./strings";
import type { ContactConsent, ContactIdentity, ContactIdentityResult } from "./types";

// The accounts a contact writes from (many emails, numbers, handles), one primary per channel, plus consent per
// channel. Linking, unlinking, choosing a primary and changing consent are async callbacks; errors they return show
// inline. Each account's actions also open as a context menu.
interface Props {
  identities: readonly ContactIdentity[];
  /** Consent per channel. Channels missing here show "Not asked". */
  consent?: Partial<Record<ContactChannel, ContactConsent>>;
  /** Channels the "Link an account" form offers. Default all. */
  channels?: readonly ContactChannel[];
  /** Channels that show a consent switch. Default email, WhatsApp and phone. */
  consentChannels?: readonly ContactChannel[];
  onAdd?: (input: { channel: ContactChannel; value: string; label?: string }) => Promise<ContactIdentityResult> | ContactIdentityResult;
  onRemove?: (identity: ContactIdentity) => Promise<ContactIdentityResult> | ContactIdentityResult;
  onSetPrimary?: (identity: ContactIdentity) => Promise<ContactIdentityResult> | ContactIdentityResult;
  /** Called when the switch is turned on (`"granted"`) or off (`"denied"`). */
  onConsentChange?: (channel: ContactChannel, status: "granted" | "denied") => Promise<ContactIdentityResult> | ContactIdentityResult;
  readOnly?: boolean;
  labels?: ContactIdentitiesLabelOverrides;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  consent: undefined,
  channels: () => CONTACT_CHANNELS,
  consentChannels: () => CONTACT_CONSENT_CHANNELS,
  onAdd: undefined,
  onRemove: undefined,
  onSetPrimary: undefined,
  onConsentChange: undefined,
  readOnly: false,
  labels: undefined,
});

const t = useContactIdentitiesLabels(() => props.labels);
const id = useId();
const sorted = computed(() => sortContactIdentities(props.identities));
const adding = ref(false);
const channel = ref<ContactChannel>(props.channels[0] ?? "email");
const value = ref("");
const label = ref("");
const issue = ref<ContactIdentityIssue | null>(null);
const error = ref<string | null>(null);
const busy = ref<string | null>(null);
const removing = ref<ContactIdentity | null>(null);
const removeOpen = ref(false);
function askRemove(identity: ContactIdentity) {
  removing.value = identity;
  removeOpen.value = true;
}
const channelItems = computed(() => props.channels.map((c) => ({ value: c, label: t.value.channels[c] })));

async function run(key: string, task: () => Promise<ContactIdentityResult> | ContactIdentityResult) {
  busy.value = key;
  error.value = null;
  try {
    const result = await task();
    if (result && result.error) {
      error.value = result.error;
      return false;
    }
    return true;
  } catch {
    error.value = t.value.failed;
    return false;
  } finally {
    busy.value = null;
  }
}

async function submit() {
  const found = validateContactIdentity(channel.value, value.value, props.identities);
  issue.value = found;
  if (found || !props.onAdd) return;
  const ok = await run("add", () => props.onAdd!({ channel: channel.value, value: value.value.trim(), label: label.value.trim() || undefined }));
  if (ok) {
    value.value = "";
    label.value = "";
    adding.value = false;
  }
}

const canPrimary = (identity: ContactIdentity) => !!props.onSetPrimary && !identity.primary && props.identities.some((i) => i.channel === identity.channel && i.id !== identity.id);

function actionsFor(identity: ContactIdentity): ContextMenuAction[] {
  return [
    ...(canPrimary(identity) ? [{ id: "primary", label: t.value.makePrimary, icon: Star, onSelect: () => void run(`primary-${identity.id}`, () => props.onSetPrimary!(identity)) }] : []),
    { id: "copy", label: t.value.copy, icon: Copy, onSelect: () => void navigator.clipboard?.writeText(identity.value) },
    ...(props.onRemove ? [{ id: "remove", label: t.value.remove, icon: Trash2, danger: true, group: "danger", onSelect: () => askRemove(identity) }] : []),
  ];
}

function confirmRemove() {
  const target = removing.value;
  if (target && props.onRemove) void run(`remove-${target.id}`, () => props.onRemove!(target));
}
</script>

<template>
  <section data-slot="contact-identities" :aria-labelledby="`${id}-title`" :class="cn('flex min-w-0 flex-col gap-6', props.class)">
    <div class="flex min-w-0 flex-col gap-3">
      <header class="flex flex-wrap items-start justify-between gap-2">
        <div class="flex min-w-0 flex-col gap-0.5">
          <h3 :id="`${id}-title`" class="text-title-sm text-foreground">{{ t.title }}</h3>
          <p class="text-body-sm text-muted-foreground">{{ t.description }}</p>
        </div>
        <NqButton v-if="!props.readOnly && props.onAdd && !adding" size="sm" @click="adding = true"><Plus aria-hidden="true" />{{ t.link }}</NqButton>
      </header>

      <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>

      <form
        v-if="adding"
        data-slot="contact-identities-form"
        class="grid gap-3 rounded-card border border-border bg-card p-3 sm:grid-cols-[10rem_1fr_9rem_auto] sm:items-start"
        @submit.prevent="submit"
      >
        <NqField>
          <NqFieldLabel>{{ t.channel }}</NqFieldLabel>
          <NqSelect :model-value="channel" @update:model-value="(v) => v && (channel = v as ContactChannel)">
            <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem v-for="c in channelItems" :key="c.value" :value="c.value">{{ c.label }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </NqField>
        <NqField :invalid="!!issue">
          <NqFieldLabel>{{ t.value }}</NqFieldLabel>
          <NqInput v-model="value" ltr autofocus :placeholder="t.valuePlaceholder" :aria-describedby="issue ? `${id}-issue` : undefined" @update:model-value="issue = null" />
          <p v-if="issue" :id="`${id}-issue`" role="alert" class="text-caption text-destructive">{{ t.issues[issue] }}</p>
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.label }}</NqFieldLabel>
          <NqInput v-model="label" :placeholder="t.labelPlaceholder" />
        </NqField>
        <div class="flex gap-2 sm:mt-6">
          <NqButton type="submit" variant="primary" :loading="busy === 'add'">{{ t.add }}</NqButton>
          <NqButton variant="ghost" @click="(adding = false), (issue = null)">{{ t.cancel }}</NqButton>
        </div>
      </form>

      <NqEmptyState v-if="sorted.length === 0" :title="t.empty" :description="t.emptyHint" :icon="Link2" class="border border-dashed border-border" />
      <ul v-else :aria-label="t.title" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
        <NqContextMenuActions
          v-for="identity in sorted"
          :key="contactIdentityKey(identity.channel, identity.value)"
          as="li"
          :actions="props.readOnly ? [] : actionsFor(identity)"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5"
        >
          <NqBadge variant="outline" class="min-w-20 justify-center">{{ t.channels[identity.channel] }}</NqBadge>
          <bdi dir="ltr" class="min-w-0 flex-1 truncate text-body tabular-nums text-foreground">{{ identity.value }}</bdi>
          <span v-if="identity.label" class="text-caption text-muted-foreground">{{ identity.label }}</span>
          <span v-if="identity.verified" class="inline-flex items-center gap-1 text-caption text-nq-success-text">
            <BadgeCheck aria-hidden="true" class="size-3.5" />{{ t.verified }}
          </span>
          <NqBadge v-if="identity.primary" variant="brand"><Star aria-hidden="true" />{{ t.primary }}</NqBadge>
          <span v-if="!props.readOnly" class="ms-auto flex items-center gap-1">
            <NqButton v-if="canPrimary(identity)" size="sm" variant="ghost" :loading="busy === `primary-${identity.id}`" @click="run(`primary-${identity.id}`, () => props.onSetPrimary!(identity))">{{ t.makePrimary }}</NqButton>
            <NqButton v-if="props.onRemove" size="icon-sm" variant="ghost" :aria-label="`${t.remove} ${identity.value}`" @click="askRemove(identity)"><Trash2 aria-hidden="true" /></NqButton>
          </span>
        </NqContextMenuActions>
      </ul>
    </div>

    <div class="flex min-w-0 flex-col gap-3">
      <header class="flex flex-col gap-0.5">
        <h3 class="text-title-sm text-foreground">{{ t.consentTitle }}</h3>
        <p class="text-body-sm text-muted-foreground">{{ t.consentDescription }}</p>
      </header>
      <ul :aria-label="t.consentTitle" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
        <li v-for="c in props.consentChannels" :key="c" class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="text-label text-foreground">{{ t.channels[c] }}</span>
            <NqContactConsentStatusText v-if="props.identities.some((i) => i.channel === c)" :consent="props.consent?.[c]" :labels="props.labels" />
            <span v-else class="text-caption text-muted-foreground">{{ t.consentNoAccount }}</span>
          </div>
          <NqSwitch
            :aria-label="t.consentSwitch(t.channels[c])"
            :model-value="props.consent?.[c]?.status === 'granted'"
            :disabled="props.readOnly || !props.onConsentChange || !props.identities.some((i) => i.channel === c) || busy === `consent-${c}`"
            @update:model-value="(next: boolean) => run(`consent-${c}`, async () => props.onConsentChange?.(c, next ? 'granted' : 'denied'))"
          />
        </li>
      </ul>
    </div>

    <NqAlertDialog v-model:open="removeOpen">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ t.removeTitle(removing?.value ?? "") }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.removeBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel>{{ t.cancel }}</NqAlertDialogCancel>
          <NqAlertDialogAction @click="confirmRemove">{{ t.remove }}</NqAlertDialogAction>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </section>
</template>
