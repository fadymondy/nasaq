<script setup lang="ts">
import { computed, ref, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import NqAppleLogo from "./NqAppleLogo.vue";
import NqGitHubLogo from "./NqGitHubLogo.vue";
import NqGoogleLogo from "./NqGoogleLogo.vue";
import NqLastUsed from "./NqLastUsed.vue";
import NqMicrosoftLogo from "./NqMicrosoftLogo.vue";
import type { OAuthButtonsLabels, OAuthIntent, OAuthProvider, OAuthProviderId } from "./types";

interface Props {
  /** Providers in display order. Default `["google", "github"]`. */
  providers?: OAuthProvider[];
  /** Called with the provider id. Return a promise to show that provider's loading state until it settles. */
  onSelect: (id: string) => void | Promise<unknown>;
  /** `stack`: full-width rows. `grid`: two columns. `icon-only`: a row of square buttons. Default `stack`. */
  layout?: "stack" | "grid" | "icon-only";
  /** Which approved verb the buttons use. Default `continue`. */
  intent?: OAuthIntent;
  /** Keep this provider in the loading state from outside, for redirect flows. */
  pendingProvider?: string | null;
  disabled?: boolean;
  /**
   * The provider this person signed in with last time. It gets a "Last used" badge, which stops people creating a
   * second account with another provider. Read it from your own cookie or session; the component stores nothing.
   */
  lastUsed?: string | null;
  labels?: Partial<OAuthButtonsLabels>;
  class?: HTMLAttributes["class"];
}

const STRINGS: Record<"en" | "ar", OAuthButtonsLabels> = {
  en: {
    signin: "Sign in with {provider}",
    signup: "Sign up with {provider}",
    continue: "Continue with {provider}",
    group: "Sign in with a provider",
    divider: "or",
    lastUsed: "Last used",
  },
  ar: {
    signin: "تسجيل الدخول باستخدام {provider}",
    signup: "إنشاء حساب باستخدام {provider}",
    continue: "المتابعة باستخدام {provider}",
    group: "تسجيل الدخول عبر مزوّد",
    divider: "أو",
    lastUsed: "آخر استخدام",
  },
};
/** Provider names are brand names: they are never translated. */
const NAMES: Record<OAuthProviderId, string> = { google: "Google", github: "GitHub", apple: "Apple", microsoft: "Microsoft" };

const props = withDefaults(defineProps<Props>(), { providers: () => ["google", "github"], layout: "stack", intent: "continue", pendingProvider: undefined });

const nasaq = useNasaq();
const dark = computed(() => nasaq.resolvedTheme.value === "dark");
const labels = computed(() => ({ ...STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const own = ref<string | null>(null);
const active = computed(() => props.pendingProvider ?? own.value);

async function select(id: string) {
  if (active.value) return;
  try {
    const result = props.onSelect(id);
    if (result && typeof (result as Promise<unknown>).then === "function") {
      own.value = id;
      await result;
    }
  } finally {
    own.value = null;
  }
}

const rows = computed(() =>
  props.providers.map((provider) => {
    const custom = typeof provider === "object";
    const id = custom ? provider.id : provider;
    const name = custom ? provider.label : NAMES[provider];
    const template = labels.value[props.intent];
    const [before = "", after = ""] = template.split("{provider}");
    return {
      id,
      kind: custom ? "custom" : provider,
      icon: custom ? (provider.icon as Component) : null,
      name,
      before,
      after,
      text: custom ? provider.label : template.replace("{provider}", name),
    };
  }),
);
</script>

<template>
  <div
    role="group"
    :aria-label="labels.group"
    data-slot="oauth-buttons"
    :data-layout="props.layout"
    :class="
      cn(
        props.layout === 'stack' && 'flex w-full flex-col gap-2',
        props.layout === 'grid' && 'grid w-full grid-cols-2 gap-2',
        props.layout === 'icon-only' && 'flex w-full flex-wrap items-center gap-2',
        props.class,
      )
    "
  >
    <NqButton
      v-for="row in rows"
      :key="row.id"
      type="button"
      variant="secondary"
      :size="props.layout === 'icon-only' ? 'icon' : 'md'"
      data-slot="oauth-button"
      :data-provider="row.id"
      :aria-label="props.layout === 'icon-only' ? row.text : undefined"
      :title="props.layout === 'icon-only' ? row.text : undefined"
      :loading="active === row.id"
      :disabled="props.disabled || (active !== null && active !== row.id)"
      :class="
        cn(
          props.layout !== 'icon-only' && 'relative w-full min-w-0 justify-center gap-3',
          row.kind === 'apple' && (dark ? 'border-white bg-white text-black hover:bg-white/90' : 'border-black bg-black text-white hover:bg-black/90'),
          row.kind !== 'custom' && active !== row.id && '[&_svg]:size-auto',
        )
      "
      @click="select(row.id)"
    >
      <template v-if="active !== row.id">
        <component :is="row.icon" v-if="row.kind === 'custom' && row.icon" />
        <NqGoogleLogo v-else-if="row.kind === 'google'" />
        <NqGitHubLogo v-else-if="row.kind === 'github'" :on-dark="dark" />
        <NqAppleLogo v-else-if="row.kind === 'apple'" :on-dark="!dark" />
        <NqMicrosoftLogo v-else-if="row.kind === 'microsoft'" />
      </template>
      <template v-if="props.layout !== 'icon-only'">
        <span v-if="row.kind === 'custom'" class="truncate">{{ row.text }}</span>
        <span v-else class="truncate">{{ row.before }}<bdi>{{ row.name }}</bdi>{{ row.after }}</span>
      </template>
      <NqLastUsed v-if="props.lastUsed === row.id && props.layout !== 'icon-only'">{{ labels.lastUsed }}</NqLastUsed>
    </NqButton>
  </div>
</template>
