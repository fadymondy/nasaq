<script setup lang="ts">
import { NqProfileHoverCard, type PersonProfile } from "@fadymondy/nasaq/vue";

const sara: PersonProfile = { id: "u1", name: "Sara Nasser", handle: "sara", role: "Design lead", presence: "online", timeZone: "Asia/Riyadh", teams: ["Design"] };
const openChat = (id: string) => console.log("message", id);
const go = (path: string) => console.log("go", path);
</script>

<template>
  <NqProfileHoverCard :person="sara" @message="(p) => openChat(p.id)" @view-profile="(p) => go(`/people/${p.id}`)">
    <a href="/people/u1">Sara Nasser</a>
  </NqProfileHoverCard>
</template>
