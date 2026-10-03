<script setup lang="ts">
import { Ban, CircleCheck, TimerOff, UserRoundX, type LucideIcon } from "lucide-vue-next";
import { computed, defineComponent, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqAuthLayout, useAuthLocale, type AuthSubmitResult } from "../auth-layout";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDateTime } from "../numeric";
import { STRINGS, isolate, type InviteAcceptLabels, type InviteState, type InviteWorkspace } from "./strings";

// The public page behind an invitation link. It handles the five things a link can turn out to be: a valid invitation (accept or
// decline, or sign in first), an expired one, one sent to another account than the one signed in, one already used, and one that
// was cancelled. It does no fetching: you resolve the link and pass `state`.
interface Props {
  /** What the link resolves to. */
  state: InviteState;
  workspace: InviteWorkspace;
  /** Who sent it. */
  invitedBy?: { name: string; email?: string };
  /** The role label the person gets. */
  role?: string;
  /** The address the invitation was sent to. */
  inviteEmail?: string;
  expiresAt?: string | number | Date;
  /** The signed-in account, or nothing when signed out. */
  account?: { name: string; email: string; avatar?: string } | null;
  /** Join. Resolve with `{ error }` to show a failure. */
  onAccept: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  onDecline?: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Signed out: go to sign in, then come back to this link. */
  onSignIn?: () => void;
  /** Signed out: go to sign up with the invited email prefilled. */
  onSignUp?: () => void;
  /** Wrong account: sign out and sign in with the right one. */
  onSwitchAccount?: () => void | Promise<void>;
  /** Expired: tell the inviter. Resolve with `{ error }` to show a failure. */
  onRequestNew?: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Already accepted: open the workspace. */
  onOpenWorkspace?: () => void;
  /** Revoked and expired: leave the page. */
  onGoHome?: () => void;
  /** Render only the content, without the page frame, to place it in your own layout. */
  bare?: boolean;
  labels?: InviteAcceptLabels;
  /** `AuthLayout` props, used when not `bare`. */
  variant?: "card" | "split";
  mark?: boolean;
  backdrop?: boolean;
  origin?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  invitedBy: undefined,
  role: undefined,
  inviteEmail: undefined,
  expiresAt: undefined,
  account: undefined,
  onDecline: undefined,
  onSignIn: undefined,
  onSignUp: undefined,
  onSwitchAccount: undefined,
  onRequestNew: undefined,
  onOpenWorkspace: undefined,
  onGoHome: undefined,
  bare: false,
  labels: undefined,
  variant: "card",
  mark: true,
  backdrop: true,
  origin: true,
});

const locale = useAuthLocale();
const t = computed(() => ({ ...STRINGS[locale.value], ...props.labels }));
type Busy = "accept" | "decline" | "request" | "switch";
const busy = ref<Busy | null>(null);
const error = ref<string | null>(null);
const requested = ref(false);
const who = computed(() => props.invitedBy?.name);

async function run(kind: Busy, fn: () => Promise<AuthSubmitResult | void> | AuthSubmitResult | void, onOk?: () => void) {
  busy.value = kind;
  error.value = null;
  try {
    const result = await fn();
    if (result && typeof result === "object" && result.error) error.value = result.error;
    else onOk?.();
  } catch {
    error.value = t.value.failed;
  } finally {
    busy.value = null;
  }
}

const STATE_ICON: Record<Exclude<InviteState, "valid">, { icon: LucideIcon; tone: string }> = {
  expired: { icon: TimerOff, tone: "text-nq-warning-text bg-nq-warning-soft" },
  "wrong-account": { icon: UserRoundX, tone: "text-nq-warning-text bg-nq-warning-soft" },
  "already-accepted": { icon: CircleCheck, tone: "text-nq-success-text bg-nq-success-soft" },
  revoked: { icon: Ban, tone: "text-nq-danger-text bg-nq-danger-soft" },
};
const glyph = computed(() => (props.state === "valid" ? null : STATE_ICON[props.state]));

const heading = computed(() => {
  const s = t.value;
  const w = props.workspace.name;
  switch (props.state) {
    case "valid":
      return { title: s.validTitle(w), description: who.value ? s.validBody(who.value) : s.validBodyAnon };
    case "expired":
      return { title: s.expiredTitle, description: who.value ? s.expiredBody(who.value) : s.expiredBodyAnon };
    case "wrong-account":
      return { title: s.wrongTitle, description: s.wrongBody(isolate(props.inviteEmail ?? ""), isolate(props.account?.email ?? "")) };
    case "already-accepted":
      return { title: s.acceptedTitle, description: s.acceptedBody(w) };
    default:
      return { title: s.revokedTitle, description: who.value ? s.revokedBody(who.value) : s.revokedBodyAnon };
  }
});

// Without the page frame: just a heading and the content.
const Bare = defineComponent({
  props: { title: { type: String, default: "" }, description: { type: String, default: "" }, class: { type: null, default: undefined } },
  setup(p, { slots }) {
    return () =>
      h("section", { "aria-labelledby": "invite-accept-title", class: cn("flex flex-col gap-4", p.class as HTMLAttributes["class"]) }, [
        h("header", { class: "flex flex-col gap-1.5" }, [h("h1", { id: "invite-accept-title", class: "text-h2 text-foreground" }, p.title), h("p", { class: "text-body-sm text-muted-foreground" }, p.description)]),
        slots.default?.(),
      ]);
  },
});
const frameProps = computed(() =>
  props.bare
    ? { title: heading.value.title, description: heading.value.description, class: props.class }
    : { title: heading.value.title, description: heading.value.description, variant: props.variant, mark: props.mark, backdrop: props.backdrop, origin: props.origin, class: props.class },
);
</script>

<template>
  <component :is="bare ? Bare : NqAuthLayout" v-bind="frameProps">
    <div data-slot="invite-accept" :data-state="state" class="flex flex-col gap-4">
      <span v-if="glyph" aria-hidden="true" :class="cn('mx-auto flex size-12 items-center justify-center rounded-full [&_svg]:size-6', glyph.tone)">
        <component :is="glyph.icon" />
      </span>
      <div data-slot="invite-workspace" class="flex items-center gap-3 rounded-card border border-border bg-background/60 p-3">
        <NqAvatar :name="workspace.name" :src="workspace.logo" shape="square" size="lg" />
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span class="truncate text-label text-foreground">{{ workspace.name }}</span>
          <span v-if="workspace.meta" class="truncate text-caption text-muted-foreground">{{ workspace.meta }}</span>
        </div>
        <NqBadge v-if="state === 'valid' && role" variant="neutral">{{ role }}</NqBadge>
      </div>

      <template v-if="state === 'valid'">
        <dl class="flex flex-col gap-1.5 text-body-sm">
          <div v-if="role" class="flex justify-between gap-3">
            <dt class="text-muted-foreground">{{ t.invitedAs }}</dt>
            <dd class="text-foreground">{{ role }}</dd>
          </div>
          <div v-if="inviteEmail" class="flex justify-between gap-3">
            <dt class="text-muted-foreground">{{ t.invitedEmail }}</dt>
            <dd class="text-foreground"><bdi dir="ltr">{{ inviteEmail }}</bdi></dd>
          </div>
          <div v-if="expiresAt" class="flex justify-between gap-3">
            <dt class="text-muted-foreground">{{ t.expiresOn }}</dt>
            <dd class="text-foreground"><NqDateTime :value="expiresAt" :format="{ dateStyle: 'medium' }" /></dd>
          </div>
        </dl>
        <template v-if="account">
          <div class="flex items-center gap-2.5 text-body-sm text-muted-foreground">
            <NqAvatar :name="account.name" :src="account.avatar" size="sm" />
            <span class="min-w-0">{{ t.signedInAs }} <bdi dir="ltr" class="text-foreground">{{ account.email }}</bdi></span>
          </div>
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <NqButton v-if="onDecline" variant="ghost" :disabled="busy !== null" :loading="busy === 'decline'" @click="run('decline', onDecline)">{{ t.decline }}</NqButton>
            <NqButton variant="primary" :disabled="busy !== null && busy !== 'accept'" :loading="busy === 'accept'" @click="run('accept', onAccept)">{{ t.accept }}</NqButton>
          </div>
        </template>
        <div v-else class="flex flex-col gap-2">
          <p v-if="inviteEmail" class="text-caption text-muted-foreground">{{ t.signInHint(isolate(inviteEmail)) }}</p>
          <NqButton variant="primary" @click="onSignIn?.()">{{ t.signInToAccept }}</NqButton>
          <NqButton v-if="onSignUp" variant="secondary" @click="onSignUp()">{{ t.createAccount }}</NqButton>
        </div>
      </template>

      <template v-else-if="state === 'expired'">
        <NqAlert v-if="requested" tone="success">{{ t.requested }}</NqAlert>
        <NqButton v-if="onRequestNew && !requested" variant="primary" :loading="busy === 'request'" @click="run('request', onRequestNew, () => (requested = true))">{{ t.requestNew }}</NqButton>
      </template>

      <NqButton v-else-if="state === 'wrong-account'" variant="primary" :loading="busy === 'switch'" @click="run('switch', async () => void (await onSwitchAccount?.()))">{{ t.switchAccount }}</NqButton>

      <template v-else-if="state === 'already-accepted'">
        <NqButton v-if="onOpenWorkspace" variant="primary" @click="onOpenWorkspace()">{{ t.open(workspace.name) }}</NqButton>
      </template>

      <template v-else>
        <NqButton v-if="onGoHome" variant="secondary" @click="onGoHome()">{{ t.goHome }}</NqButton>
      </template>

      <NqAlert v-if="error" tone="danger" role="alert">{{ error }}</NqAlert>
    </div>
    <template v-if="$slots.prompt" #prompt><slot name="prompt" /></template>
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </component>
</template>
