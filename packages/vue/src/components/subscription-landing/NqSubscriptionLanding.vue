<script setup lang="ts">
import { CheckCircle2, MailCheck, MailX } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCard } from "../card";
import { NqCheckbox } from "../checkbox";
import { NqField, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqRadio, NqRadioGroup } from "../radio-group";
import { STRINGS, type SubscriptionLandingLabels } from "./labels";
import { maskSubscriberEmail, validateSubscription } from "./subscription-landing-logic";

export type SubscriptionLandingMode = "subscribe" | "confirm" | "unsubscribe";
export type SubscriptionResult = void | { error?: string };

interface Props {
  /** Which page this is. Each is its own address in a real product. */
  mode: SubscriptionLandingMode;
  /** The sender's name or mark, shown above the card (or use the `brand` slot). Give text for a brand, never a substitute icon. */
  brand?: string;
  /** The person's address for the confirm and unsubscribe pages (they arrive from an email link). */
  email?: string;
  /** Subscribe page. After it resolves the page asks the person to check their inbox. */
  onSubscribe?: (input: { email: string; name?: string }) => Promise<SubscriptionResult>;
  /** Confirm page. A button, never automatic, so mail scanners that open links do not subscribe anyone. */
  onConfirm?: () => Promise<SubscriptionResult>;
  /** Unsubscribe page. `reason` is one of the `reasons` keys. */
  onUnsubscribe?: (input: { reason?: string; note?: string }) => Promise<SubscriptionResult>;
  /** Undo an unsubscribe. */
  onResubscribe?: () => Promise<SubscriptionResult>;
  /** Reason keys offered on the unsubscribe page. Default too_many, not_relevant, never_signed, other. */
  reasons?: string[];
  /** Ask for a name on the subscribe page. */
  askName?: boolean;
  class?: HTMLAttributes["class"];
  labels?: Partial<SubscriptionLandingLabels>;
}

/**
 * The three public pages of an email list: subscribe (with explicit consent), confirm (double opt-in) and
 * unsubscribe (with an optional reason and a way back). One centred card each. Fully full width on a phone.
 */
const props = withDefaults(defineProps<Props>(), {
  brand: undefined,
  email: undefined,
  onSubscribe: undefined,
  onConfirm: undefined,
  onUnsubscribe: undefined,
  onResubscribe: undefined,
  reasons: undefined,
  askName: false,
  labels: undefined,
});

type Stage = "form" | "pending" | "done" | "undone";

const nasaq = useNasaq();
const t = computed<SubscriptionLandingLabels>(() => {
  const base = STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"];
  return { ...base, ...props.labels, issues: { ...base.issues, ...props.labels?.issues }, reasons: { ...base.reasons, ...props.labels?.reasons } };
});
const id = useId();
const stage = ref<Stage>("form");
const name = ref("");
const email = ref(props.email ?? "");
const consent = ref(false);
const reason = ref("");
const note = ref("");
const busy = ref(false);
const error = ref<string | null>(null);
const tried = ref(false);

const issues = computed(() => validateSubscription({ email: email.value, consent: consent.value }));
const emailIssue = computed(() => (issues.value.includes("email-empty") ? "email-empty" : issues.value.includes("email-invalid") ? "email-invalid" : null));
const shownEmail = computed(() => props.email ?? email.value);
const keys = computed(() => props.reasons ?? ["too_many", "not_relevant", "never_signed", "other"]);

async function run(fn: () => Promise<SubscriptionResult> | undefined, next: Stage) {
  busy.value = true;
  error.value = null;
  try {
    const r = await fn();
    if (r && r.error) error.value = r.error;
    else stage.value = next;
  } catch {
    error.value = t.value.failed;
  } finally {
    busy.value = false;
  }
}

function submitSubscribe() {
  tried.value = true;
  if (issues.value.length) return;
  void run(() => props.onSubscribe?.({ email: email.value.trim(), name: name.value.trim() || undefined }), "pending");
}

function startOver() {
  stage.value = "form";
  consent.value = false;
  tried.value = false;
}
</script>

<template>
  <div
    data-slot="subscription-landing"
    :data-mode="props.mode"
    :class="cn('flex min-h-full w-full flex-col items-center justify-center gap-6 p-4 sm:p-8', props.class)"
  >
    <div v-if="props.brand || $slots.brand" class="text-h4 text-foreground"><slot name="brand">{{ props.brand }}</slot></div>
    <NqCard class="w-full max-w-md p-6">
      <!-- subscribe -->
      <template v-if="props.mode === 'subscribe'">
        <div v-if="stage === 'pending'" class="flex flex-col gap-4" role="status">
          <div class="flex flex-col items-center gap-3 text-center">
            <span aria-hidden="true" class="flex size-12 items-center justify-center rounded-full bg-secondary text-foreground [&_svg]:size-6"><MailCheck /></span>
            <h1 class="text-h3 text-foreground">{{ t.pendingTitle }}</h1>
            <p dir="auto" class="text-body-sm text-muted-foreground">{{ t.pendingBody(email.trim()) }}</p>
          </div>
          <NqButton variant="ghost" @click="startOver">{{ t.pendingWrong }}</NqButton>
        </div>
        <form v-else novalidate class="flex flex-col gap-4" @submit.prevent="submitSubscribe">
          <div class="flex flex-col items-center gap-3 text-center">
            <span aria-hidden="true" class="flex size-12 items-center justify-center rounded-full bg-secondary text-foreground [&_svg]:size-6"><MailCheck /></span>
            <h1 class="text-h3 text-foreground">{{ t.subscribeTitle }}</h1>
            <p dir="auto" class="text-body-sm text-muted-foreground">{{ t.subscribeBody }}</p>
          </div>
          <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
          <NqField v-if="props.askName">
            <NqFieldLabel>
              {{ t.name }} <span class="text-caption font-normal text-muted-foreground">({{ t.optional }})</span>
            </NqFieldLabel>
            <NqInput v-model="name" autocomplete="name" />
          </NqField>
          <NqField :invalid="tried && !!emailIssue">
            <NqFieldLabel>{{ t.email }}</NqFieldLabel>
            <NqInput v-model="email" ltr type="email" autocomplete="email" />
            <p v-if="tried && emailIssue" role="alert" class="text-caption text-destructive">{{ t.issues[emailIssue] }}</p>
          </NqField>
          <div class="flex flex-col gap-1">
            <label :for="`${id}-consent`" class="flex items-start gap-2 text-body-sm">
              <NqCheckbox :id="`${id}-consent`" v-model="consent" class="mt-0.5" />
              <span>{{ t.consent }}</span>
            </label>
            <p v-if="tried && issues.includes('consent-missing')" role="alert" class="text-caption text-destructive">{{ t.issues["consent-missing"] }}</p>
          </div>
          <NqButton type="submit" variant="primary" :loading="busy" class="w-full">{{ t.subscribe }}</NqButton>
          <p class="text-center text-caption text-muted-foreground">{{ t.privacy }}</p>
        </form>
      </template>

      <!-- confirm -->
      <template v-else-if="props.mode === 'confirm'">
        <div v-if="stage === 'done'" role="status">
          <div class="flex flex-col items-center gap-3 text-center">
            <span aria-hidden="true" class="flex size-12 items-center justify-center rounded-full bg-secondary text-foreground [&_svg]:size-6"><CheckCircle2 /></span>
            <h1 class="text-h3 text-foreground">{{ t.confirmedTitle }}</h1>
            <p dir="auto" class="text-body-sm text-muted-foreground">{{ t.confirmedBody }}</p>
          </div>
        </div>
        <div v-else class="flex flex-col gap-4">
          <div class="flex flex-col items-center gap-3 text-center">
            <span aria-hidden="true" class="flex size-12 items-center justify-center rounded-full bg-secondary text-foreground [&_svg]:size-6"><MailCheck /></span>
            <h1 class="text-h3 text-foreground">{{ t.confirmTitle }}</h1>
            <p dir="auto" class="text-body-sm text-muted-foreground">{{ t.confirmBody(maskSubscriberEmail(shownEmail)) }}</p>
          </div>
          <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
          <NqButton variant="primary" :loading="busy" class="w-full" @click="run(() => props.onConfirm?.(), 'done')">{{ t.confirm }}</NqButton>
        </div>
      </template>

      <!-- unsubscribe: done -->
      <div v-else-if="stage === 'done'" class="flex flex-col gap-4" role="status">
        <div class="flex flex-col items-center gap-3 text-center">
          <span aria-hidden="true" class="flex size-12 items-center justify-center rounded-full bg-secondary text-foreground [&_svg]:size-6"><MailX /></span>
          <h1 class="text-h3 text-foreground">{{ t.unsubscribedTitle }}</h1>
          <p dir="auto" class="text-body-sm text-muted-foreground">{{ t.unsubscribedBody(maskSubscriberEmail(shownEmail)) }}</p>
        </div>
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <NqButton v-if="props.onResubscribe" variant="secondary" :loading="busy" class="w-full" @click="run(() => props.onResubscribe?.(), 'undone')">{{ t.resubscribe }}</NqButton>
      </div>

      <!-- unsubscribe: undone -->
      <div v-else-if="stage === 'undone'" role="status">
        <div class="flex flex-col items-center gap-3 text-center">
          <span aria-hidden="true" class="flex size-12 items-center justify-center rounded-full bg-secondary text-foreground [&_svg]:size-6"><CheckCircle2 /></span>
          <h1 class="text-h3 text-foreground">{{ t.resubscribedTitle }}</h1>
          <p dir="auto" class="text-body-sm text-muted-foreground">{{ t.resubscribedBody }}</p>
        </div>
      </div>

      <!-- unsubscribe: form -->
      <form
        v-else
        class="flex flex-col gap-4"
        @submit.prevent="run(() => props.onUnsubscribe?.({ reason: reason || undefined, note: note.trim() || undefined }), 'done')"
      >
        <div class="flex flex-col items-center gap-3 text-center">
          <span aria-hidden="true" class="flex size-12 items-center justify-center rounded-full bg-secondary text-foreground [&_svg]:size-6"><MailX /></span>
          <h1 class="text-h3 text-foreground">{{ t.unsubscribeTitle }}</h1>
          <p dir="auto" class="text-body-sm text-muted-foreground">{{ t.unsubscribeBody(maskSubscriberEmail(shownEmail)) }}</p>
        </div>
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <fieldset class="flex flex-col gap-2">
          <legend class="mb-1 text-label text-foreground">{{ t.reasonLabel }}</legend>
          <NqRadioGroup v-model="reason" class="flex flex-col gap-2">
            <label v-for="k in keys" :key="k" class="flex items-center gap-2 text-body-sm">
              <NqRadio :value="k" />
              {{ t.reasons[k] ?? k }}
            </label>
          </NqRadioGroup>
        </fieldset>
        <NqField v-if="reason === 'other'">
          <NqFieldLabel>{{ t.note }}</NqFieldLabel>
          <NqTextarea v-model="note" :rows="3" />
        </NqField>
        <NqButton type="submit" variant="primary" :loading="busy" class="w-full">{{ t.unsubscribe }}</NqButton>
      </form>
    </NqCard>
  </div>
</template>
