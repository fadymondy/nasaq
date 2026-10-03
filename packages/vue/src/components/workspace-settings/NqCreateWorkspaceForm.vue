<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { workspaceStrings, type WorkspaceSettingsLabels } from "./strings";
import type { SlugCheck, WorkspaceSubmitResult, WorkspaceValues } from "./types";
import { useSlugCheck } from "./use-slug-check";
import NqWorkspaceSlugField from "./NqWorkspaceSlugField.vue";
import { slugProblem, slugify } from "./workspace-slug";

// Name and address of a new workspace. The address follows the name until the person edits it.
const props = withDefaults(
  defineProps<{
    onSubmit: (values: WorkspaceValues) => Promise<WorkspaceSubmitResult> | WorkspaceSubmitResult;
    /** Is this address free? Called after typing pauses, for a valid address. */
    checkSlug?: (slug: string) => Promise<SlugCheck>;
    /** Shown before the address field, always left-to-right: "nasaq.app/". */
    slugPrefix?: string;
    /** Show the address field. Default true. */
    showSlug?: boolean;
    defaultName?: string;
    submitLabel?: string;
    /** Adds a Cancel button. */
    onCancel?: () => void;
    labels?: WorkspaceSettingsLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { checkSlug: undefined, slugPrefix: undefined, showSlug: true, defaultName: "", submitLabel: undefined, onCancel: undefined, labels: undefined, class: undefined },
);

const nq = useNasaq();
const t = computed(() => ({ ...workspaceStrings(nq.locale.value), ...props.labels }));
const name = ref(props.defaultName);
const slug = ref(slugify(props.defaultName));
const touched = ref(false);
const attempted = ref(false);
const serverErrors = ref<Partial<Record<"name" | "slug", string>>>({});
const formError = ref<string | null>(null);
const busy = ref(false);
const state = useSlugCheck(slug, () => props.checkSlug);

const problem = computed(() => (props.showSlug ? slugProblem(slug.value) : null));
const nameError = computed(() => serverErrors.value.name ?? (attempted.value && !name.value.trim() ? t.value.nameRequired : undefined));
const slugError = computed(
  () =>
    serverErrors.value.slug ??
    (state.value.status === "taken" ? (state.value.message ?? t.value.slugTaken) : problem.value && (touched.value || attempted.value) && (slug.value || attempted.value) ? t.value.problem[problem.value] : undefined),
);
const hint = computed(() => (state.value.status === "checking" ? t.value.slugChecking : state.value.status === "available" ? t.value.slugAvailable : state.value.status === "error" ? t.value.slugCheckFailed : t.value.slugHelp));

function onName(v: string | number | undefined) {
  name.value = String(v ?? "");
  if (!touched.value) slug.value = slugify(name.value);
  serverErrors.value = { ...serverErrors.value, name: undefined };
}
function onSlugEdit() {
  touched.value = true;
  serverErrors.value = { ...serverErrors.value, slug: undefined };
}

async function submit() {
  attempted.value = true;
  formError.value = null;
  if (!name.value.trim() || problem.value || state.value.status === "taken" || state.value.status === "checking" || busy.value) return;
  busy.value = true;
  try {
    const result = await props.onSubmit({ name: name.value.trim(), slug: slug.value });
    if (result && typeof result === "object" && (result.error || result.fieldErrors)) {
      serverErrors.value = result.fieldErrors ?? {};
      formError.value = result.error ?? null;
    }
  } catch {
    formError.value = t.value.failed;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form data-slot="create-workspace-form" novalidate :class="cn('flex flex-col gap-4', props.class)" @submit.prevent="submit">
    <NqField :invalid="!!nameError">
      <NqFieldLabel>{{ t.name }}</NqFieldLabel>
      <NqInput :model-value="name" autocomplete="organization" :placeholder="t.namePlaceholder" :disabled="busy" @update:model-value="onName" />
      <NqFieldError :match="!!nameError">{{ nameError }}</NqFieldError>
    </NqField>
    <NqWorkspaceSlugField v-if="showSlug" v-model="slug" :label="t.slug" :prefix="slugPrefix" :state="state" :error="slugError" :hint="hint" :disabled="busy" live @edit="onSlugEdit" />
    <NqAlert v-if="formError" tone="danger" role="alert">{{ formError }}</NqAlert>
    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <NqButton v-if="onCancel" type="button" variant="ghost" :disabled="busy" @click="onCancel()">{{ t.cancel }}</NqButton>
      <NqButton type="submit" variant="primary" :loading="busy">{{ submitLabel ?? t.create }}</NqButton>
    </div>
  </form>
</template>
