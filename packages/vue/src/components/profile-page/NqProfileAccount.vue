<script setup lang="ts">
import { Lock } from "lucide-vue-next";
import { NqIcon } from "../icon";
import NqProfileSection from "./NqProfileSection.vue";
import { useProfileStrings, type ProfilePageLabels } from "./strings";
import type { ProfileAccountDetail } from "./types";

// The owner's account at a glance: email, language, time zone, organisations, member since. Only shown to them.
const props = defineProps<{
  details: ProfileAccountDetail[];
  /** Replaces the default "Only you can see this." */
  description?: string;
  labels?: Partial<ProfilePageLabels>;
}>();
const { t } = useProfileStrings(() => props.labels);
</script>

<template>
  <NqProfileSection :title="t.account">
    <template #description>
      <template v-if="props.description">{{ props.description }}</template>
      <span v-else class="inline-flex items-center gap-1.5"><NqIcon :icon="Lock" class="size-3.5" />{{ t.accountHint }}</span>
    </template>
    <dl class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
      <div v-for="(d, i) in props.details" :key="i" class="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
        <dt class="text-body-sm text-muted-foreground">{{ d.label }}</dt>
        <dd class="min-w-0 text-body-sm text-foreground">{{ d.value }}</dd>
      </div>
    </dl>
  </NqProfileSection>
</template>
