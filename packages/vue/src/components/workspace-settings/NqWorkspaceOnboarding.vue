<script setup lang="ts">
import { computed } from "vue";
import { useNasaq } from "../../provider";
import { NqAuthLayout } from "../auth-layout";
import NqCreateWorkspaceForm from "./NqCreateWorkspaceForm.vue";
import { workspaceStrings, type WorkspaceSettingsLabels } from "./strings";
import type { SlugCheck, WorkspaceSubmitResult, WorkspaceValues } from "./types";

// First run: a signed-in person with no workspace names one. A page (NqAuthLayout), or `bare` for your own layout.
const props = withDefaults(
  defineProps<{
    onSubmit: (values: WorkspaceValues) => Promise<WorkspaceSubmitResult> | WorkspaceSubmitResult;
    checkSlug?: (slug: string) => Promise<SlugCheck>;
    slugPrefix?: string;
    showSlug?: boolean;
    defaultName?: string;
    /** Render only the form, to place it in your own page. */
    bare?: boolean;
    variant?: "card" | "split";
    mark?: boolean;
    backdrop?: boolean;
    origin?: boolean;
    labels?: WorkspaceSettingsLabels;
  }>(),
  { checkSlug: undefined, slugPrefix: undefined, showSlug: undefined, defaultName: undefined, bare: false, variant: "card", mark: true, backdrop: true, origin: true, labels: undefined },
);
const nq = useNasaq();
const t = computed(() => ({ ...workspaceStrings(nq.locale.value), ...props.labels }));
</script>

<template>
  <section v-if="bare" class="flex flex-col gap-4">
    <header class="flex flex-col gap-1.5">
      <h1 class="text-h2 text-foreground">{{ t.onboardTitle }}</h1>
      <p class="text-body-sm text-muted-foreground">{{ t.onboardBody }}</p>
    </header>
    <NqCreateWorkspaceForm data-slot="workspace-onboarding" :on-submit="onSubmit" :check-slug="checkSlug" :slug-prefix="slugPrefix" :show-slug="showSlug" :default-name="defaultName" :labels="labels" />
  </section>
  <NqAuthLayout v-else :variant="variant" :mark="mark" :backdrop="backdrop" :origin="origin" :title="t.onboardTitle" :description="t.onboardBody">
    <NqCreateWorkspaceForm data-slot="workspace-onboarding" :on-submit="onSubmit" :check-slug="checkSlug" :slug-prefix="slugPrefix" :show-slug="showSlug" :default-name="defaultName" :labels="labels" />
  </NqAuthLayout>
</template>
