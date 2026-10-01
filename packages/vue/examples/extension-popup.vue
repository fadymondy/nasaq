<script setup lang="ts">
import { NqExtensionConnect, NqExtensionMiniCard, NqExtensionPopup, NqExtensionQuickActions } from "@fadymondy/nasaq/vue";
import { Bookmark, Globe, Link2 } from "lucide-vue-next";
import { ref } from "vue";

const paused = ref(false);
const connected = ref(false);
const connect = async ({ server }: { server: string }) => {
  // In a real extension, open the sign-in tab for `server`.
  await new Promise((r) => setTimeout(r, 400));
  if (server.includes("fail")) return { error: "Could not reach that server." };
  connected.value = true;
};
const actions = [
  { id: "open", label: "Open app", icon: Globe, onSelect: () => undefined, external: true },
  { id: "save", label: "Save this page", icon: Bookmark, onSelect: () => undefined },
  { id: "copy", label: "Copy link", icon: Link2, onSelect: () => undefined },
];
</script>

<template>
  <NqExtensionPopup :status="connected ? 'connected' : 'disconnected'" :paused="paused" :on-paused-change="(v: boolean) => (paused = v)" :on-open-options="() => undefined">
    <template #brand><span dir="ltr">Nasaq</span></template>
    <NqExtensionConnect v-if="!connected" :on-connect="connect" />
    <template v-else>
      <NqExtensionMiniCard title="Saved today" :icon="Bookmark" :status="{ label: 'Synced', tone: 'success' }" :value="12" hint="Pages and snippets" />
      <NqExtensionQuickActions :actions="actions" />
    </template>
    <template #footer>v1.4.0</template>
  </NqExtensionPopup>
</template>
