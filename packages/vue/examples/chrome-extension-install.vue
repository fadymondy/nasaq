<script setup lang="ts">
import { ref } from "vue";
import { NqChromeExtensionInstall } from "@fadymondy/nasaq/vue";

const installed = ref(false);
const signedIn = ref(false);
const check = async () => {
  await new Promise((r) => setTimeout(r, 600));
  installed.value = true;
};
const signIn = async () => {
  await new Promise((r) => setTimeout(r, 600));
  signedIn.value = true;
};
</script>

<template>
  <NqChromeExtensionInstall store-url="https://chromewebstore.google.com/detail/example" :installed="installed" version="1.0.0" :signed-in="signedIn" :on-check="check" :on-sign-in="signIn" />
</template>
