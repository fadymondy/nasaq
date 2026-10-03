<script setup lang="ts">
import { ArrowLeft, Building2, CircleCheck, FileQuestion, Hourglass, RotateCw, ServerCrash, ShieldX, WifiOff, Wrench } from "lucide-vue-next";
import { computed, ref, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqCopyButton } from "../copy-button";
import { NqDateTime } from "../numeric";
import { NqProductLogo } from "../product-mark";
import { ERROR_PAGE_STRINGS, statusCodeFor, type ErrorPageKind, type ErrorPageLabels } from "./strings";

// A full-page state for the places a product cannot show what was asked for: not found, server error, offline,
// maintenance, no access, unknown workspace and a module that is not built yet. It shows what happened, what
// to do next, and never a stack trace. It is presentational: you pass the handlers, it never navigates.
interface Props {
  kind: ErrorPageKind;
  /** Replaces the heading (or use the `title` slot). */
  title?: string;
  /** Replaces the sentence under it (or use the `description` slot). */
  description?: string;
  /** Replaces the big status code (404, 500, 403, 503). Pass `null` to hide it. */
  code?: string | null;
  /** Pass `null` for no logo; the default is the provider brand's mark and name. Use the `logo` slot for your own. */
  logo?: null;
  /** `server-error`: the id to quote to support, with a copy button. */
  errorId?: string;
  /** `unknown-workspace`: the address that was tried. */
  workspace?: string;
  /** `coming-soon`: the name of the module. */
  moduleName?: string;
  /** `maintenance`: when the service is expected back. */
  eta?: number | Date | string;
  /** `offline`: `true` once the connection is back, so the page offers a reload. Use `useOnlineStatus()`. */
  online?: boolean;
  onHome?: () => void;
  onBack?: () => void;
  onRetry?: () => void | Promise<unknown>;
  onContactSupport?: () => void;
  onSwitchWorkspace?: () => void;
  onRequestAccess?: () => void | Promise<unknown>;
  /** `coming-soon`: sign up for a heads-up. */
  onNotify?: () => void | Promise<unknown>;
  /** Fill the screen (`min-h-dvh`). Turn off to place it in a panel. Default true. */
  fullScreen?: boolean;
  labels?: Partial<ErrorPageLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  description: undefined,
  code: undefined,
  logo: undefined,
  errorId: undefined,
  workspace: undefined,
  moduleName: undefined,
  eta: undefined,
  online: false,
  onHome: undefined,
  onBack: undefined,
  onRetry: undefined,
  onContactSupport: undefined,
  onSwitchWorkspace: undefined,
  onRequestAccess: undefined,
  onNotify: undefined,
  fullScreen: true,
  labels: undefined,
});

const nq = useNasaq();
const t = computed(() => ({ ...ERROR_PAGE_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const busy = ref<"retry" | "access" | "notify" | null>(null);
const notified = ref(false);

const KIND_ICON: Record<ErrorPageKind, Component> = {
  "not-found": FileQuestion,
  "server-error": ServerCrash,
  offline: WifiOff,
  maintenance: Wrench,
  forbidden: ShieldX,
  "unknown-workspace": Building2,
  "coming-soon": Hourglass,
};
const BadgeIcon = computed(() => (props.kind === "offline" && props.online ? CircleCheck : KIND_ICON[props.kind]));
const shownCode = computed(() => (props.code === undefined ? statusCodeFor(props.kind) : props.code));

const copy = computed<[string, string]>(() => {
  const s = t.value;
  switch (props.kind) {
    case "not-found":
      return [s.notFoundTitle, s.notFoundBody];
    case "server-error":
      return [s.serverTitle, s.serverBody];
    case "offline":
      return props.online ? [s.onlineTitle, s.onlineBody] : [s.offlineTitle, s.offlineBody];
    case "maintenance":
      return [s.maintenanceTitle, s.maintenanceBody];
    case "forbidden":
      return [s.forbiddenTitle, s.forbiddenBody];
    case "unknown-workspace":
      return [s.workspaceTitle, props.workspace ? s.workspaceNamed.replace("{name}", props.workspace) : s.workspaceBody];
    default:
      return [props.moduleName ? s.soonNamed.replace("{name}", props.moduleName) : s.soonTitle, s.soonBody];
  }
});

async function run(which: "retry" | "access" | "notify", fn?: () => void | Promise<unknown>) {
  if (!fn) return;
  busy.value = which;
  try {
    await fn();
    if (which === "notify") notified.value = true;
  } finally {
    busy.value = null;
  }
}

const tone = computed(() =>
  props.kind === "server-error"
    ? "text-nq-danger-text"
    : props.kind === "maintenance" || props.kind === "offline"
      ? props.kind === "offline" && props.online
        ? "text-nq-success-text"
        : "text-nq-warning-text"
      : "text-muted-foreground",
);
</script>

<template>
  <main
    data-slot="error-page"
    :data-kind="props.kind"
    :class="cn('flex flex-col items-center justify-center gap-8 bg-background p-6 text-center text-foreground', props.fullScreen && 'min-h-dvh', props.class)"
  >
    <slot name="logo"><NqProductLogo v-if="props.logo !== null" :size="24" /></slot>
    <div class="flex max-w-md flex-col items-center gap-4">
      <span aria-hidden="true" :class="cn('inline-flex size-12 items-center justify-center rounded-card border border-border bg-card [&_svg]:size-6', tone)">
        <component :is="BadgeIcon" />
      </span>
      <p v-if="shownCode" dir="ltr" data-slot="error-page-code" class="text-display font-mono text-muted-foreground/60">{{ shownCode }}</p>
      <div class="flex flex-col gap-2" :role="props.kind === 'server-error' ? 'alert' : undefined">
        <h1 class="text-h2 text-foreground"><slot name="title">{{ props.title ?? copy[0] }}</slot></h1>
        <p class="text-body text-muted-foreground"><slot name="description">{{ props.description ?? copy[1] }}</slot></p>
      </div>
      <p v-if="props.kind === 'maintenance' && props.eta !== undefined" class="text-body-sm text-muted-foreground">
        {{ t.maintenanceEta }}: <NqDateTime :value="props.eta" :format="{ dateStyle: 'medium', timeStyle: 'short' }" class="text-foreground" />
      </p>
      <p v-if="props.kind === 'server-error' && props.errorId" class="flex items-center gap-1 text-caption text-muted-foreground">
        {{ t.errorId }}
        <bdi dir="ltr" class="font-mono text-foreground">{{ props.errorId }}</bdi>
        <NqCopyButton :value="props.errorId" :label="t.copyId" variant="ghost" size="icon-sm" />
      </p>
      <p v-if="props.kind === 'coming-soon' && notified" role="status" class="flex items-center gap-1.5 text-body-sm text-nq-success-text">
        <CircleCheck aria-hidden="true" class="size-4" />
        {{ t.notified }}
      </p>
    </div>
    <div class="flex flex-wrap items-center justify-center gap-2">
      <slot name="actions">
        <template v-if="props.kind === 'not-found'">
          <NqButton v-if="props.onHome" variant="primary" @click="props.onHome">{{ t.home }}</NqButton>
          <NqButton v-if="props.onBack" variant="secondary" @click="props.onBack"><ArrowLeft aria-hidden="true" class="rtl:-scale-x-100" />{{ t.back }}</NqButton>
        </template>
        <template v-else-if="props.kind === 'server-error'">
          <NqButton v-if="props.onRetry" variant="primary" :loading="busy === 'retry'" @click="run('retry', props.onRetry)"><RotateCw aria-hidden="true" />{{ t.retry }}</NqButton>
          <NqButton v-if="props.onHome" variant="secondary" @click="props.onHome">{{ t.home }}</NqButton>
          <NqButton v-if="props.onContactSupport" variant="ghost" @click="props.onContactSupport">{{ t.support }}</NqButton>
        </template>
        <template v-else-if="props.kind === 'offline'">
          <NqButton v-if="props.onRetry" variant="primary" :loading="busy === 'retry'" @click="run('retry', props.onRetry)"><RotateCw aria-hidden="true" />{{ props.online ? t.reload : t.retry }}</NqButton>
        </template>
        <template v-else-if="props.kind === 'maintenance'">
          <NqButton v-if="props.onRetry" variant="primary" :loading="busy === 'retry'" @click="run('retry', props.onRetry)"><RotateCw aria-hidden="true" />{{ t.retry }}</NqButton>
          <NqButton v-if="props.onContactSupport" variant="ghost" @click="props.onContactSupport">{{ t.support }}</NqButton>
        </template>
        <template v-else-if="props.kind === 'forbidden'">
          <NqButton v-if="props.onRequestAccess" variant="primary" :loading="busy === 'access'" @click="run('access', props.onRequestAccess)">{{ t.requestAccess }}</NqButton>
          <NqButton v-if="props.onHome" variant="secondary" @click="props.onHome">{{ t.home }}</NqButton>
        </template>
        <template v-else-if="props.kind === 'unknown-workspace'">
          <NqButton v-if="props.onSwitchWorkspace" variant="primary" @click="props.onSwitchWorkspace">{{ t.switchWorkspace }}</NqButton>
          <NqButton v-if="props.onHome" variant="secondary" @click="props.onHome">{{ t.home }}</NqButton>
          <NqButton v-if="props.onContactSupport" variant="ghost" @click="props.onContactSupport">{{ t.support }}</NqButton>
        </template>
        <template v-else>
          <NqButton v-if="props.onNotify && !notified" variant="primary" :loading="busy === 'notify'" @click="run('notify', props.onNotify)">{{ t.notify }}</NqButton>
          <NqButton v-if="props.onHome" :variant="props.onNotify && !notified ? 'secondary' : 'primary'" @click="props.onHome">{{ t.home }}</NqButton>
        </template>
      </slot>
    </div>
  </main>
</template>
