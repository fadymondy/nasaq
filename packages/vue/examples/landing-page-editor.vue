<script setup lang="ts">
import { NqLandingPageEditor, createSection, type LandingPage } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const page = ref<LandingPage>({
  title: "Launch",
  slug: "launch",
  seoTitle: "",
  seoDescription: "",
  dir: "ltr",
  status: "draft",
  sections: [createSection("hero", "en"), createSection("cta", "en")],
});

async function save(p: LandingPage) {
  // Your request. Return { error } to show a message.
}
async function publish(p: LandingPage) {
  // Your request.
}
</script>

<template>
  <NqLandingPageEditor v-model="page" :on-save="save" :on-publish="publish" />
</template>
