<script setup lang="ts">
import { NqSettingRow, NqSettingsSections, NqSwitch } from "@fadymondy/nasaq/vue";
import { computed, ref } from "vue";

const saved = ref(false);
const draft = ref(false);
const dirty = computed(() => (draft.value !== saved.value ? 1 : 0));
const groups = [
  {
    id: "general",
    label: "General",
    pages: [{ id: "notifications", label: "Notifications", entries: [{ id: "email", label: "Email digest" }] }],
  },
];
</script>

<template>
  <NqSettingsSections
    title="Settings"
    :groups="groups"
    :dirty="dirty"
    :on-save="async () => { saved = draft; }"
    :on-discard="() => { draft = saved; }"
  >
    <template #notifications>
      <NqSettingRow id="email" label="Email digest" description="A weekly summary.">
        <NqSwitch v-model="draft" aria-label="Email digest" />
      </NqSettingRow>
    </template>
  </NqSettingsSections>
</template>
