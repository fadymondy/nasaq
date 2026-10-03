<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Send, Users } from "lucide-vue-next";
import { computed, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogAction, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCopyButton } from "../copy-button";
import { NqEmailTemplatePreview, fillVariables, type EmailVariable } from "../email-templates";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqNum } from "../numeric";
import { NqProgress } from "../progress";
import { NqRichTextEditor, type RichTextTiptap } from "../rich-text-editor";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqCampaignTestDialog from "./NqCampaignTestDialog.vue";
import { CAMPAIGN_CHANNELS, CAMPAIGN_WHATSAPP_MAX, campaignProgress, validateCampaign, type CampaignChannel } from "./campaign-logic";
import { STRINGS, type CampaignComposerLabels } from "./strings";
import type { CampaignAudience, CampaignDraft, CampaignResult, CampaignSendProgress } from "./types";

/**
 * Compose a broadcast to an audience by email or WhatsApp: pick who, see the live count, write the message,
 * preview it as the reader sees it, send a test, check what is missing, confirm, and watch the send progress.
 * Every callback is yours, so the same screen works against any sender. The email body uses the rich text editor
 * when `load` (the Tiptap loader) is given, and an HTML textarea otherwise.
 */
interface Props {
  audiences: CampaignAudience[];
  /** `{{key}}` variables the message may use. `sample` fills the preview and the test. */
  variables?: EmailVariable[];
  /** Start with this draft. */
  defaultValue?: Partial<CampaignDraft>;
  /** Counts the people in an audience on a channel, live. Falls back to `audience.counts`. */
  onCountAudience?: (audienceId: string, channel: CampaignChannel) => Promise<number>;
  /** Sends the message to one address or number. WhatsApp tests go only to the own number of the workspace. */
  onSendTest?: (draft: CampaignDraft, to: string) => Promise<CampaignResult>;
  onSend?: (draft: CampaignDraft) => Promise<CampaignResult>;
  /** Controlled send progress. While set, the composer locks and shows the bar. */
  progress?: CampaignSendProgress | null;
  onStopSending?: () => void;
  sender?: { name: string; email: string };
  /** Default for the test dialog. */
  testRecipient?: string;
  /** Loads Tiptap for the email body: `() => import("./tiptap")`. Without it the body is an HTML textarea. */
  load?: () => Promise<RichTextTiptap>;
  labels?: Partial<Omit<CampaignComposerLabels, "issues">> & { issues?: Partial<CampaignComposerLabels["issues"]> };
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  variables: () => [], defaultValue: undefined, onCountAudience: undefined, onSendTest: undefined, onSend: undefined, progress: null,
  onStopSending: undefined, sender: undefined, testRecipient: undefined, load: undefined, labels: undefined,
});
const emit = defineEmits<{ change: [draft: CampaignDraft] }>();

const nq = useNasaq();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const t = computed<CampaignComposerLabels>(() => {
  const base = STRINGS[ar.value ? "ar" : "en"];
  return { ...base, ...props.labels, issues: { ...base.issues, ...props.labels?.issues } } as CampaignComposerLabels;
});
const id = useId();
const draft = ref<CampaignDraft>({ channel: "email", audienceId: null, subject: "", body: "", ...props.defaultValue });
const count = ref<number | null>(null);
const countError = ref(false);
const testing = ref(false);
const confirming = ref(false);
const sending = ref(false);
const sendError = ref<string | null>(null);
const tried = ref(false);

function patch(next: Partial<CampaignDraft>) {
  draft.value = { ...draft.value, ...next };
  emit("change", draft.value);
}

const audience = computed(() => props.audiences.find((a) => a.id === draft.value.audienceId) ?? null);
const staticCount = computed(() => audience.value?.counts?.[draft.value.channel]);

watch(
  [() => draft.value.audienceId, () => draft.value.channel, staticCount, () => Boolean(props.onCountAudience)],
  ([audienceId, channel], _old, onCleanup) => {
    countError.value = false;
    if (!audienceId) {
      count.value = null;
      return;
    }
    const counter = props.onCountAudience;
    if (!counter) {
      count.value = staticCount.value ?? null;
      return;
    }
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });
    count.value = null;
    counter(audienceId, channel as CampaignChannel).then(
      (n) => {
        if (!cancelled) count.value = n;
      },
      () => {
        if (!cancelled) countError.value = true;
      },
    );
  },
  { immediate: true },
);

const issues = computed(() =>
  validateCampaign({
    channel: draft.value.channel,
    audienceId: draft.value.audienceId,
    audienceCount: countError.value ? null : count.value,
    subject: draft.value.subject,
    body: draft.value.body,
    knownVariables: props.variables.map((v) => v.key),
  }),
);
const locked = computed(() => !!props.progress || sending.value);
const isEmail = computed(() => draft.value.channel === "email");
const bodyText = computed(() => (isEmail.value ? draft.value.body : fillVariables(draft.value.body, props.variables)));
const prog = computed(() => (props.progress ? campaignProgress(props.progress) : null));
const dir = computed(() => (ar.value ? "rtl" : "ltr"));
const recipient = computed(() => props.variables.find((v) => v.key === "email")?.sample);

function onChannel(v: string[]) {
  const next = v[0] as CampaignChannel | undefined;
  if (next && !locked.value) patch({ channel: next, body: next === draft.value.channel ? draft.value.body : "" });
}

async function start() {
  confirming.value = false;
  sending.value = true;
  sendError.value = null;
  try {
    const r = await props.onSend?.(draft.value);
    if (r && r.error) sendError.value = r.error;
  } catch {
    sendError.value = t.value.failed;
  } finally {
    sending.value = false;
  }
}
function trySend() {
  tried.value = true;
  if (issues.value.length === 0) confirming.value = true;
}
const insertVariable = (key: string) => patch({ body: `${draft.value.body}{{${key}}}` });
const varToken = (key: string) => `{{${key}}}`;
</script>

<template>
  <div data-slot="campaign-composer" :class="cn('grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]', props.class)">
    <div class="flex min-w-0 flex-col gap-5">
      <NqField>
        <NqFieldLabel>{{ t.channel }}</NqFieldLabel>
        <NqToggleGroup :model-value="[draft.channel]" :aria-label="t.channel" @update:model-value="onChannel">
          <NqToggle v-for="c in CAMPAIGN_CHANNELS" :key="c" :value="c" :disabled="locked">{{ t.channels[c] }}</NqToggle>
        </NqToggleGroup>
      </NqField>

      <NqField>
        <NqFieldLabel>{{ t.audience }}</NqFieldLabel>
        <NqSelect :model-value="draft.audienceId" :disabled="locked" @update:model-value="(v: string | number | null) => v && patch({ audienceId: String(v) })">
          <NqSelectTrigger><NqSelectValue :placeholder="t.audiencePlaceholder" /></NqSelectTrigger>
          <NqSelectContent>
            <NqSelectItem v-for="a in props.audiences" :key="a.id" :value="a.id">{{ a.label }}</NqSelectItem>
          </NqSelectContent>
        </NqSelect>
        <NqFieldDescription v-if="audience?.description">{{ audience.description }}</NqFieldDescription>
      </NqField>

      <div role="status" aria-live="polite" data-slot="campaign-audience-count" class="flex items-center gap-3 rounded-card border border-border bg-nq-surface-soft p-3">
        <Users aria-hidden="true" class="size-5 text-muted-foreground" />
        <div class="flex flex-col">
          <span class="text-caption text-muted-foreground">{{ t.reach }}</span>
          <span v-if="!draft.audienceId" class="text-body-sm text-muted-foreground">—</span>
          <span v-else-if="countError" class="text-body-sm text-destructive">{{ t.countFailed }}</span>
          <span v-else-if="count == null" class="text-body-sm text-muted-foreground">{{ t.counting }}</span>
          <span v-else class="text-body font-medium text-foreground">
            <NqNum :value="count" /> {{ t.people(count) }}
          </span>
        </div>
      </div>

      <NqField v-if="isEmail">
        <NqFieldLabel>{{ t.subject }}</NqFieldLabel>
        <NqInput :model-value="draft.subject" :disabled="locked" @update:model-value="(v: string | number | undefined) => patch({ subject: String(v ?? '') })" />
        <NqFieldDescription>{{ t.subjectHint }}</NqFieldDescription>
      </NqField>

      <div class="flex flex-col gap-2">
        <span :id="`${id}-body`" class="text-label text-foreground">{{ isEmail ? t.body : t.whatsappBody }}</span>
        <template v-if="isEmail">
          <NqRichTextEditor
            v-if="props.load"
            :aria-labelledby="`${id}-body`"
            :load="props.load"
            :model-value="draft.body"
            :read-only="locked"
            min-height="12rem"
            :toolbar="['bold', 'italic', 'underline', 'h2', 'bulletList', 'orderedList', 'link', 'undo', 'redo']"
            @update:model-value="(v) => patch({ body: String(v ?? '') })"
          />
          <NqTextarea v-else :aria-labelledby="`${id}-body`" dir="ltr" :rows="10" class="font-mono text-code" :disabled="locked" :model-value="draft.body" @update:model-value="(v: string | number | undefined) => patch({ body: String(v ?? '') })" />
        </template>
        <template v-else>
          <NqTextarea :aria-labelledby="`${id}-body`" :rows="8" :model-value="draft.body" :disabled="locked" @update:model-value="(v: string | number | undefined) => patch({ body: String(v ?? '') })" />
          <div class="flex items-center justify-between gap-2 text-caption text-muted-foreground">
            <span>{{ t.whatsappHint }}</span>
            <bdi dir="ltr" :class="cn(draft.body.length > CAMPAIGN_WHATSAPP_MAX && 'text-destructive')">{{ t.characters(draft.body.length, CAMPAIGN_WHATSAPP_MAX) }}</bdi>
          </div>
        </template>
        <div v-if="props.variables.length" role="group" :aria-label="t.variables" class="flex flex-wrap items-center gap-1.5">
          <span class="text-caption text-muted-foreground">{{ t.variables }}. {{ t.variablesHint }}</span>
          <template v-for="v in props.variables" :key="v.key">
            <NqCopyButton v-if="isEmail" :value="varToken(v.key)" :label="t.copyVariable(v.label)">{{ v.label }}</NqCopyButton>
            <NqButton v-else type="button" size="sm" variant="secondary" :disabled="locked" :aria-label="t.insert(v.label)" @click="insertVariable(v.key)">{{ v.label }}</NqButton>
          </template>
        </div>
      </div>
    </div>

    <div class="flex min-w-0 flex-col gap-4">
      <NqEmailTemplatePreview
        v-if="isEmail"
        :template="{ subject: draft.subject, body: draft.body || '<p></p>', dir, footer: t.footerEmail }"
        :variables="props.variables"
        :sender="props.sender"
        :recipient="recipient"
      />
      <div v-else class="flex flex-col gap-3">
        <span class="text-label text-foreground">{{ t.preview }}</span>
        <div class="flex justify-center rounded-card border border-border bg-secondary p-4">
          <div class="flex w-full max-w-[22rem] flex-col gap-1 rounded-card rounded-ss-none border border-border bg-card p-3 text-body-sm">
            <p v-if="bodyText" dir="auto" class="whitespace-pre-wrap break-words text-foreground">{{ bodyText }}</p>
            <p v-else class="text-muted-foreground">{{ t.noPreview }}</p>
            <p class="text-caption text-muted-foreground">{{ t.footerWhatsapp }}</p>
          </div>
        </div>
      </div>

      <section :aria-label="t.checks" class="flex flex-col gap-2 rounded-card border border-border p-3">
        <h3 class="text-label text-foreground">{{ t.checks }}</h3>
        <p v-if="issues.length === 0" class="flex items-center gap-1.5 text-body-sm text-nq-success-text">
          <CheckCircle2 aria-hidden="true" class="size-4" />
          {{ t.ready }}
        </p>
        <ul v-else class="flex flex-col gap-1">
          <li v-for="i in issues" :key="i" :class="cn('flex items-center gap-1.5 text-body-sm', tried ? 'text-destructive' : 'text-muted-foreground')">
            <AlertTriangle aria-hidden="true" class="size-4 shrink-0" />
            {{ t.issues[i] }}
          </li>
        </ul>
      </section>

      <NqAlert v-if="sendError" tone="danger">{{ sendError }}</NqAlert>

      <section v-if="prog && props.progress" :aria-label="t.sending" class="flex flex-col gap-2 rounded-card border border-border p-3">
        <NqProgress
          :value="prog.percent"
          :label="prog.state === 'sending' ? t.sending : prog.state === 'done' ? t.done : t.partial"
          :tone="prog.state === 'done' ? 'success' : prog.state === 'partial' ? 'warning' : undefined"
        />
        <div class="flex flex-wrap items-center justify-between gap-2 text-body-sm text-muted-foreground">
          <span aria-live="polite">{{ t.sentOf(props.progress.sent, props.progress.total) }}</span>
          <NqBadge v-if="props.progress.failed > 0" variant="danger">{{ t.failedCount(props.progress.failed) }}</NqBadge>
          <NqButton v-if="prog.state === 'sending' && props.onStopSending" size="sm" variant="secondary" @click="props.onStopSending()">{{ t.stop }}</NqButton>
        </div>
      </section>

      <div class="flex flex-wrap items-center justify-end gap-2">
        <NqButton v-if="props.onSendTest" variant="secondary" :disabled="locked" @click="testing = true">{{ t.sendTest }}</NqButton>
        <NqButton variant="primary" :loading="sending" :disabled="locked || !props.onSend" @click="trySend">
          <Send aria-hidden="true" class="rtl:-scale-x-100" />
          {{ t.send }}
        </NqButton>
      </div>
    </div>

    <NqCampaignTestDialog
      v-if="testing && props.onSendTest"
      :draft="draft"
      :t="t"
      :default-to="draft.channel === 'email' ? props.testRecipient : undefined"
      :on-send-test="(to: string) => props.onSendTest!(draft, to)"
      @close="testing = false"
    />

    <NqAlertDialog :open="confirming" @update:open="(o: boolean) => (confirming = o)">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ t.sendTitle(count ?? 0) }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.sendBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel>{{ t.cancel }}</NqAlertDialogCancel>
          <NqAlertDialogAction @click="start()">{{ t.confirmSend }}</NqAlertDialogAction>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </div>
</template>
