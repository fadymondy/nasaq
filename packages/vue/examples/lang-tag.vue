<script setup lang="ts">
import { NqLangTag } from "@fadymondy/nasaq/vue";
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="flex items-center gap-2"><NqLangTag lang="en" /> Welcome to the store</p>
    <p class="flex items-center gap-2"><NqLangTag lang="ar" /> مرحبا بكم في المتجر</p>
    <p class="flex items-center gap-2"><NqLangTag lang="fr" /> Bienvenue dans la boutique</p>
  </div>
</template>
