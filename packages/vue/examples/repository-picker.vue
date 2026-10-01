<script setup lang="ts">
import { ref } from "vue";
import { NqRepositoryPicker, type PickerBranch, type PickerRepo, type RepositoryPickerValue } from "@fadymondy/nasaq/vue";

const REPOS: PickerRepo[] = [
  { id: "1", fullName: "acme/storefront", description: "The customer storefront", language: "TypeScript", defaultBranch: "main", stars: 128, updatedAt: "2026-09-20T10:00:00Z" },
  { id: "2", fullName: "acme/billing-api", private: true, language: "Go", defaultBranch: "main", stars: 12 },
  { id: "3", fullName: "acme/design-tokens", language: "CSS", defaultBranch: "trunk", stars: 54 },
];
const BRANCHES: PickerBranch[] = [{ name: "main", default: true, protected: true }, { name: "develop" }, { name: "feat/checkout" }];

const value = ref<RepositoryPickerValue>({ repo: null, branch: null });
const search = async (q: string) => REPOS.filter((r) => r.fullName.includes(q.toLowerCase()));
const branches = async () => BRANCHES;
</script>

<template>
  <NqRepositoryPicker v-model="value" :account="{ login: 'acme' }" :search-repositories="search" :load-branches="branches" :on-configure="() => console.log('configure')" />
</template>
