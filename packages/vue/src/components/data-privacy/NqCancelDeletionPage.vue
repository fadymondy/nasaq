<script setup lang="ts">
import { CircleAlert, CircleCheck, Clock, ShieldCheck } from "lucide-vue-next";
import { computed, ref, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAuthLayout } from "../auth-layout";
import { NqAvatar } from "../avatar";
import { NqButton } from "../button";
import { dataPrivacyStrings, type DataPrivacyLabels } from "./strings";
import type { CancelDeletionState, PrivacyDate } from "./types";

// The public page behind the link in the "your account is scheduled for deletion" email. It works without signing in:
// one button keeps the account. Also shows the outcomes: kept, already deleted, and a link that does not work.
interface Props {
  /** Resolve the link on the server: `ready` while the grace period runs. */
  state: CancelDeletionState;
  account?: { name: string; email: string; avatar?: string };
  scheduledFor?: PrivacyDate;
  onCancelDeletion: () => Promise<void | { error?: string }>;
  onSignIn?: () => void;
  onSignUp?: () => void;
  onGoHome?: () => void;
  /** Render only the heading and content, without the auth page frame. */
  bare?: boolean;
  variant?: "card" | "split";
  backdrop?: boolean;
  labels?: DataPrivacyLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  account: undefined,
  scheduledFor: undefined,
  onSignIn: undefined,
  onSignUp: undefined,
  onGoHome: undefined,
  bare: false,
  variant: "card",
  backdrop: true,
  labels: undefined,
});

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => ({ ...dataPrivacyStrings(locale.value), ...props.labels }));
const done = ref(false);
const busy = ref(false);
const error = ref<string | null>(null);
const shown = computed<CancelDeletionState>(() => (done.value ? "cancelled" : props.state));

async function keep() {
  busy.value = true;
  error.value = null;
  try {
    const r = await props.onCancelDeletion();
    if (r && typeof r === "object" && r.error) error.value = r.error;
    else done.value = true;
  } catch {
    error.value = t.value.cancelFailed;
  } finally {
    busy.value = false;
  }
}

const dateText = computed(() => (props.scheduledFor ? new Intl.DateTimeFormat(locale.value, { dateStyle: "long" }).format(new Date(props.scheduledFor)) : ""));
const copy = computed(() => {
  const s = t.value;
  if (shown.value === "ready") return { title: s.pageReadyTitle, description: s.pageReadyBody(dateText.value) };
  if (shown.value === "cancelled") return { title: s.pageDoneTitle, description: s.pageDoneBody };
  if (shown.value === "expired") return { title: s.pageExpiredTitle, description: s.pageExpiredBody };
  return { title: s.pageInvalidTitle, description: s.pageInvalidBody };
});
const glyph = computed<{ icon: Component; tone: string } | null>(() => {
  if (shown.value === "cancelled") return { icon: CircleCheck, tone: "bg-nq-success-soft text-nq-success-text" };
  if (shown.value === "expired") return { icon: Clock, tone: "bg-secondary text-muted-foreground" };
  if (shown.value === "invalid") return { icon: CircleAlert, tone: "bg-nq-warning-soft text-nq-warning-text" };
  return null;
});
</script>

<template>
  <component
    :is="props.bare ? 'section' : NqAuthLayout"
    v-bind="props.bare ? { class: 'flex flex-col gap-4' } : { variant: props.variant, backdrop: props.backdrop, title: copy.title, description: copy.description, class: props.class }"
  >
    <header v-if="props.bare" class="flex flex-col gap-1.5">
      <h1 class="text-h2 text-foreground">{{ copy.title }}</h1>
      <p class="text-body-sm text-muted-foreground">{{ copy.description }}</p>
    </header>
    <div data-slot="cancel-deletion-page" :data-state="shown" class="flex flex-col gap-4">
      <div v-if="glyph" :class="cn('mx-auto flex size-12 items-center justify-center rounded-full [&_svg]:size-6', glyph.tone)" aria-hidden="true">
        <component :is="glyph.icon" />
      </div>
      <template v-if="shown === 'ready'">
        <div v-if="props.account" class="flex items-center gap-3 rounded-card border border-border p-3">
          <NqAvatar :name="props.account.name" :src="props.account.avatar" />
          <div class="flex min-w-0 flex-col">
            <span class="truncate text-label text-foreground">{{ props.account.name }}</span>
            <bdi dir="ltr" class="truncate text-caption text-muted-foreground">{{ props.account.email }}</bdi>
          </div>
        </div>
        <NqButton variant="primary" :loading="busy" @click="keep">
          <ShieldCheck />
          {{ t.keep }}
        </NqButton>
      </template>
      <template v-else-if="shown === 'cancelled' || shown === 'invalid'">
        <NqButton v-if="props.onSignIn" variant="primary" @click="props.onSignIn()">{{ t.signIn }}</NqButton>
      </template>
      <template v-else>
        <NqButton v-if="props.onSignUp" variant="primary" @click="props.onSignUp()">{{ t.signUp }}</NqButton>
        <NqButton v-if="props.onGoHome" variant="ghost" @click="props.onGoHome()">{{ t.goHome }}</NqButton>
      </template>
      <NqAlert v-if="error" tone="danger" role="alert">{{ error }}</NqAlert>
    </div>
  </component>
</template>
