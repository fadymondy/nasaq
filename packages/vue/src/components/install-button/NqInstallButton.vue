<script setup lang="ts">
import { Check } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { useT } from "../../provider";
import { NqButton } from "../button";

// The install CTA for an app or product. Controlled: the caller owns `state` and moves it from "available" to
// "installing" to "installed". Once installed it turns into a quiet "Open".
export type InstallState = "available" | "installing" | "installed" | "update";
export interface InstallLabels {
  install: string;
  get: string;
  open: string;
  update: string;
}
interface Props {
  /** Where the app is in its lifecycle for this workspace. Default "available". */
  state?: InstallState;
  /** The app's name, appended to the accessible name: "Install Mahaam". */
  appName: string;
  /** Free apps say "Get" instead of "Install". */
  free?: boolean;
  /** Override the built-in English/Arabic labels. */
  labels?: Partial<InstallLabels>;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "link" | null;
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm" | null;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { state: "available", free: false, size: "sm" });
const emit = defineEmits<{ install: []; open: []; update: [] }>();
const t = useT();
const l = computed<InstallLabels>(() => ({
  install: t("Install", "تثبيت"),
  get: t("Get", "احصل عليه"),
  open: t("Open", "فتح"),
  update: t("Update", "تحديث"),
  ...props.labels,
}));
const label = computed(() => (props.state === "update" ? l.value.update : props.free ? l.value.get : l.value.install));
</script>

<template>
  <NqButton
    v-if="props.state === 'installed'"
    data-slot="install-button"
    :data-state="props.state"
    variant="ghost"
    :size="props.size"
    :disabled="props.disabled"
    :class="props.class"
    :aria-label="`${l.open} ${props.appName}`"
    @click="emit('open')"
  >
    <Check aria-hidden="true" class="text-nq-success-text" />
    {{ l.open }}
  </NqButton>
  <NqButton
    v-else
    data-slot="install-button"
    :data-state="props.state"
    :variant="props.variant ?? 'secondary'"
    :size="props.size"
    :loading="props.state === 'installing'"
    :disabled="props.disabled"
    :class="props.class"
    :aria-label="`${label} ${props.appName}`"
    @click="props.state === 'update' ? emit('update') : emit('install')"
  >
    {{ label }}
  </NqButton>
</template>
