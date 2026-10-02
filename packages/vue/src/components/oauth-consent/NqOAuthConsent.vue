<script setup lang="ts">
import { Check, ShieldAlert } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { useAuthLocale, type AuthSubmitResult } from "../auth-layout";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { STRINGS, type ConsentAccount, type ConsentApp, type ConsentScope, type OAuthConsentLabels } from "./strings";

// The "App X wants to access your account" screen: who is asking, what they can do, which account it applies to, and Allow / Deny.
// Deny is as easy to reach as Allow and both wait on your callbacks.
interface Props {
  app: ConsentApp;
  scopes: ConsentScope[];
  /** The signed-in account the app will act for. */
  account: ConsentAccount;
  /** Called by "Allow". Resolve with `{ error }` to show a failure. */
  onAllow: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Called by "Deny". */
  onDeny: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Shows a "Switch account" button beside the signed-in account. */
  onSwitchAccount?: () => void;
  /** The host people are sent back to, e.g. "app.example.com". */
  redirectHost?: string;
  /** What the account belongs to. Default: the brand name (Nasaq / نسق). */
  productName?: string;
  /** Level of the heading. Default 2; use 1 when this is the page's main heading. */
  headingLevel?: 1 | 2 | 3;
  labels?: Partial<OAuthConsentLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { onSwitchAccount: undefined, redirectHost: undefined, productName: undefined, headingLevel: 2, labels: undefined });

defineSlots<{
  /** Your own logo node, in place of the image or the app's initial. */
  logo?: () => unknown;
}>();

const locale = useAuthLocale();
const t = computed<OAuthConsentLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const { locale: nasaqLocale } = useNasaq();
const product = computed(() => props.productName ?? (String(nasaqLocale.value).startsWith("ar") ? "نسق" : "Nasaq"));
const pending = ref<"allow" | "deny" | null>(null);
const error = ref<string | undefined>();
const titleId = useId();

async function run(kind: "allow" | "deny", action: Props["onAllow"]) {
  if (pending.value) return;
  pending.value = kind;
  error.value = undefined;
  try {
    const result = await action();
    if (result?.error) error.value = result.error;
  } catch {
    error.value = t.value.failed;
  } finally {
    pending.value = null;
  }
}

const parts = computed(() => {
  const [titleBefore = "", rest = ""] = t.value.title.split("{app}");
  const [titleMid = "", titleAfter = ""] = rest.split("{product}");
  const [introBefore = "", introAfter = ""] = t.value.scopesIntro.split("{app}");
  const [redirectBefore = "", redirectAfter = ""] = t.value.redirect.split("{host}");
  return { titleBefore, titleMid, titleAfter, hasProduct: t.value.title.includes("{product}"), introBefore, introAfter, redirectBefore, redirectAfter };
});
</script>

<template>
  <section data-slot="oauth-consent" :aria-labelledby="titleId" :aria-busy="pending ? true : undefined" :class="cn('flex w-full flex-col gap-5', props.class)">
    <div class="flex flex-col items-start gap-3">
      <div data-slot="oauth-consent-app" class="flex items-center gap-3">
        <span class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-card border border-border bg-secondary text-label text-secondary-foreground">
          <slot name="logo">
            <img v-if="app.logo" :src="app.logo" alt="" class="size-full object-cover" />
            <span v-else aria-hidden="true">{{ app.name.slice(0, 1).toUpperCase() }}</span>
          </slot>
        </span>
        <span v-if="app.publisher" class="text-caption text-muted-foreground">{{ app.publisher }}</span>
      </div>
      <component :is="`h${headingLevel}`" :id="titleId" class="text-h3 text-foreground">{{ parts.titleBefore }}<bdi>{{ app.name }}</bdi>{{ parts.titleMid }}<bdi v-if="parts.hasProduct">{{ product }}</bdi>{{ parts.titleAfter }}</component>
    </div>

    <div data-slot="oauth-consent-account" class="flex items-center gap-3 rounded-card border border-border bg-card p-3">
      <NqAvatar :name="account.name" :src="account.avatar" size="lg" />
      <div class="flex min-w-0 flex-1 flex-col">
        <span class="text-caption text-muted-foreground">{{ t.signedInAs }}</span>
        <span class="truncate text-label text-foreground">{{ account.name }}</span>
        <bdi dir="ltr" class="truncate text-caption text-muted-foreground">{{ account.email }}</bdi>
      </div>
      <NqButton v-if="onSwitchAccount" type="button" variant="link" size="sm" :disabled="pending !== null" @click="onSwitchAccount()">{{ t.switchAccount }}</NqButton>
    </div>

    <div class="flex flex-col gap-2">
      <p class="text-body-sm text-foreground">{{ parts.introBefore }}<bdi class="font-medium">{{ app.name }}</bdi>{{ parts.introAfter }}</p>
      <ul data-slot="oauth-consent-scopes" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
        <li v-for="scope in scopes" :key="scope.id" :data-scope="scope.id" class="flex items-start gap-3 p-3">
          <ShieldAlert v-if="scope.sensitive" aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-nq-warning-text" />
          <Check v-else aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-nq-success-text" />
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="flex flex-wrap items-center gap-2 text-label text-foreground">
              {{ scope.label }}
              <NqBadge v-if="scope.sensitive" variant="warning">{{ t.sensitive }}</NqBadge>
            </span>
            <span v-if="scope.description" class="text-body-sm text-muted-foreground">{{ scope.description }}</span>
          </div>
        </li>
      </ul>
    </div>

    <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>

    <div class="grid grid-cols-2 gap-2">
      <NqButton type="button" variant="secondary" size="lg" :loading="pending === 'deny'" :disabled="pending === 'allow'" data-slot="oauth-consent-deny" @click="run('deny', onDeny)">{{ t.deny }}</NqButton>
      <NqButton type="button" variant="primary" size="lg" :loading="pending === 'allow'" :disabled="pending === 'deny'" data-slot="oauth-consent-allow" @click="run('allow', onAllow)">{{ t.allow }}</NqButton>
    </div>

    <p class="text-caption text-muted-foreground">
      <template v-if="redirectHost">{{ parts.redirectBefore }}<bdi dir="ltr" class="font-medium text-foreground">{{ redirectHost }}</bdi>{{ parts.redirectAfter }} </template>
      {{ t.revoke }}
    </p>
  </section>
</template>
