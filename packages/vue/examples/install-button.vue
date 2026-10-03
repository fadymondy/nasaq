<script setup lang="ts">
import { NqInstallButton, type InstallState } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const state = ref<InstallState>("available");
function install() {
  state.value = "installing";
  setTimeout(() => (state.value = "installed"), 1500);
}
</script>

<template>
  <NqInstallButton app-name="Mahaam" :state="state" @install="install" />
</template>
