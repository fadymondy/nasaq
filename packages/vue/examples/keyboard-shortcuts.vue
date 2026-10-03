<script setup lang="ts">
import { NqShortcutsReference, type ShortcutGroup } from "@fadymondy/nasaq/vue";

const groups: ShortcutGroup[] = [
  { id: "nav", title: "Navigation", titleAr: "التنقل", items: [
    { id: "palette", label: "Open the command palette", labelAr: "فتح لوحة الأوامر", keys: "Mod+K" },
    { id: "inbox", label: "Go to inbox", labelAr: "الانتقال إلى الوارد", keys: "G I" },
  ] },
];
</script>

<template>
  <NqShortcutsReference :groups="groups" />
</template>
