<script setup lang="ts">
import { Eye, ShieldUser } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { NqButton } from "../button";
import { NqDateTime } from "../numeric";

// A bar that says "you are viewing as X" with an exit button. A role="status" region, pinned to the top.
// `onExit` ends the session; reject (or throw) to keep the banner and show a failure.
export interface ImpersonationBannerLabels {
  impersonating: (name: string) => string;
  impersonatingHint: string;
  previewing: (name: string) => string;
  previewingHint: string;
  exit: string;
  exitPreview: string;
  exiting: string;
  since: string;
  failed: string;
}

interface Props {
  /** Whose view this is. `email` shows beside the name, always left-to-right. */
  as: { name: string; email?: string };
  /** `impersonate`: an admin acts as the user. `preview`: a safe look, nothing is saved. Default `impersonate`. */
  mode?: "impersonate" | "preview";
  /** When the session started. Shown as a relative time. */
  startedAt?: string | number | Date;
  /** Ends the session. Reject to keep the banner and show a failure. */
  onExit: () => void | Promise<void>;
  /** Pin to the top of the scroll container. Default true. */
  sticky?: boolean;
  /** Replaces the hint sentence (also the `hint` slot). */
  hint?: string;
  labels?: Partial<ImpersonationBannerLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { mode: "impersonate", sticky: true, startedAt: undefined, hint: undefined, labels: undefined });
const t = useT();
const s = computed<ImpersonationBannerLabels>(() => ({
  impersonating: (name) => t(`You are viewing the app as ${name}.`, `أنت تتصفح التطبيق بصفة ${name}.`),
  impersonatingHint: t("Actions you take count as this user.", "الإجراءات التي تنفذها تُنسب إلى هذا المستخدم."),
  previewing: (name) => t(`Previewing as ${name}.`, `معاينة بصفة ${name}.`),
  previewingHint: t("Nothing you do here is saved.", "لا يُحفظ أي شيء تفعله هنا."),
  exit: t("Exit impersonation", "إنهاء انتحال الصفة"),
  exitPreview: t("Exit preview", "إنهاء المعاينة"),
  exiting: t("Exiting…", "جارٍ الخروج…"),
  since: t("Since", "منذ"),
  failed: t("Could not exit. Try again.", "تعذّر الخروج. حاول مرة أخرى."),
  ...props.labels,
}));
const preview = computed(() => props.mode === "preview");
const busy = ref(false);
const failed = ref(false);
let alive = true;
onBeforeUnmount(() => (alive = false));

async function exit() {
  if (busy.value) return;
  busy.value = true;
  failed.value = false;
  try {
    await props.onExit();
  } catch {
    if (alive) failed.value = true;
  } finally {
    if (alive) busy.value = false;
  }
}
</script>

<template>
  <div
    role="status"
    data-slot="impersonation-banner"
    :data-mode="props.mode"
    :class="
      cn(
        'flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-body-sm',
        preview ? 'bg-nq-info-soft text-nq-info-text' : 'bg-nq-warning-soft text-nq-warning-text',
        props.sticky && 'sticky top-0 z-40',
        props.class,
      )
    "
  >
    <Eye v-if="preview" aria-hidden="true" class="size-4 shrink-0" />
    <ShieldUser v-else aria-hidden="true" class="size-4 shrink-0" />
    <span class="min-w-0 flex-1">
      <span class="font-medium">{{ (preview ? s.previewing : s.impersonating)(props.as.name) }}</span>{{ " " }}
      <bdi v-if="props.as.email" dir="ltr" class="opacity-80">{{ props.as.email }}</bdi>{{ " " }}
      <span class="opacity-80"><slot name="hint">{{ props.hint ?? (preview ? s.previewingHint : s.impersonatingHint) }}</slot></span>
      <span v-if="props.startedAt !== undefined" class="ms-2 opacity-80">{{ s.since }} <NqDateTime :value="props.startedAt" relative /></span>
      <span v-if="failed" role="alert" class="ms-2 font-medium">{{ s.failed }}</span>
    </span>
    <NqButton size="sm" variant="secondary" :loading="busy" @click="exit">{{ busy ? s.exiting : preview ? s.exitPreview : s.exit }}</NqButton>
  </div>
</template>
