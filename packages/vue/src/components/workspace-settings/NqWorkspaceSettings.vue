<script setup lang="ts">
import { LogOut } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqDangerZone, NqSettingsSection } from "../account-settings";
import { NqAlert } from "../alert";
import { NqConfirmButton } from "../alert-dialog";
import { NqAvatarUpload } from "../avatar-upload";
import { NqButton } from "../button";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { workspaceStrings, type WorkspaceSettingsLabels } from "./strings";
import type { SlugCheck, WorkspaceSubmitResult, WorkspaceValues } from "./types";
import { useSlugCheck } from "./use-slug-check";
import NqWorkspaceSlugField from "./NqWorkspaceSlugField.vue";
import { deletePhrase, slugProblem } from "./workspace-slug";

// Manage one workspace: rename it and change its address and picture, leave it, and delete it. Leaving asks first and is
// blocked for the last owner; deleting needs the workspace name typed, so a stray Enter cannot do it.
const props = withDefaults(
  defineProps<{
    workspace: { name: string; slug: string; logo?: string };
    /** Owners and admins can rename and change the picture. Default true. */
    canEdit?: boolean;
    /** Owners can delete. Default true. Without `onDelete` the section is hidden anyway. */
    canDelete?: boolean;
    /** False when you are the only owner: leave is disabled and says why. Default true. */
    canLeave?: boolean;
    slugPrefix?: string;
    /** Is this address free? Only called for a valid address that differs from the saved one. */
    checkSlug?: (slug: string) => Promise<SlugCheck>;
    onRename?: (values: WorkspaceValues) => Promise<WorkspaceSubmitResult> | WorkspaceSubmitResult;
    /** Picture upload. Omit `onChange` to hide the picture. */
    logo?: {
      onChange?: (file: File, controls: { onProgress?: (percent: number) => void }) => Promise<void>;
      onRemove?: () => Promise<void>;
      accept?: string;
      maxSize?: number;
      outputSize?: number;
      outputType?: "image/webp" | "image/png" | "image/jpeg";
    };
    onLeave?: () => Promise<void>;
    /** Deletes the workspace. Reject to keep the dialog open and show the error. */
    onDelete?: () => Promise<void>;
    labels?: WorkspaceSettingsLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { canEdit: true, canDelete: true, canLeave: true, slugPrefix: undefined, checkSlug: undefined, onRename: undefined, logo: undefined, onLeave: undefined, onDelete: undefined, labels: undefined, class: undefined },
);

const nq = useNasaq();
const t = computed(() => ({ ...workspaceStrings(nq.locale.value), ...props.labels }));
const name = ref(props.workspace.name);
const slug = ref(props.workspace.slug);
const saving = ref(false);
const notice = ref<{ tone: "success" | "danger"; text: string } | null>(null);
const errors = ref<Partial<Record<"name" | "slug", string>>>({});
watch(
  () => [props.workspace.name, props.workspace.slug] as const,
  ([n, s]) => {
    name.value = n;
    slug.value = s;
  },
);
const state = useSlugCheck(
  slug,
  () => props.checkSlug,
  () => props.workspace.slug,
);

const dirty = computed(() => name.value.trim() !== props.workspace.name || slug.value !== props.workspace.slug);
const problem = computed(() => slugProblem(slug.value));
const nameError = computed(() => errors.value.name ?? (!name.value.trim() ? t.value.nameRequired : undefined));
const slugError = computed(() => errors.value.slug ?? (state.value.status === "taken" ? (state.value.message ?? t.value.slugTaken) : problem.value ? t.value.problem[problem.value] : undefined));
const invalid = computed(() => !!nameError.value || !!slugError.value || state.value.status === "checking");
const shownSlugError = computed(() => (slugError.value && (dirty.value || errors.value.slug) ? slugError.value : undefined));
const hint = computed(() => (state.value.status === "checking" ? t.value.slugChecking : state.value.status === "available" ? t.value.slugAvailable : t.value.slugHelp));
const phrase = computed(() => deletePhrase(props.workspace.name));
const deleteLabels = computed(() => ({
  button: t.value.deleteButton,
  confirmTitle: t.value.deleteConfirmTitle(props.workspace.name),
  confirmDescription: t.value.deleteConfirmBody,
  confirmPrompt: t.value.deletePrompt,
  confirmAction: t.value.deleteAction,
  cancel: t.value.cancel,
  failed: t.value.deleteFailed,
}));

function clearNotice() {
  notice.value = null;
}
function onName(v: string | number | undefined) {
  name.value = String(v ?? "");
  errors.value = { ...errors.value, name: undefined };
  clearNotice();
}
function onSlugEdit() {
  errors.value = { ...errors.value, slug: undefined };
  clearNotice();
}

async function save() {
  if (!dirty.value || invalid.value || saving.value) return;
  saving.value = true;
  notice.value = null;
  try {
    const result = await props.onRename?.({ name: name.value.trim(), slug: slug.value });
    if (result && typeof result === "object" && (result.error || result.fieldErrors)) {
      errors.value = result.fieldErrors ?? {};
      if (result.error) notice.value = { tone: "danger", text: result.error };
    } else {
      errors.value = {};
      notice.value = { tone: "success", text: t.value.saved };
    }
  } catch {
    notice.value = { tone: "danger", text: t.value.failed };
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div data-slot="workspace-settings" :class="cn('flex flex-col gap-6', props.class)">
    <NqSettingsSection :title="t.generalTitle" :description="t.generalBody" :footer="canEdit ? undefined : t.readOnly">
      <template v-if="canEdit && onRename" #actions>
        <NqButton type="submit" form="workspace-general" variant="primary" :loading="saving" :disabled="!dirty || invalid">{{ t.save }}</NqButton>
      </template>
      <form id="workspace-general" novalidate class="flex flex-col gap-5" @submit.prevent="save">
        <NqAvatarUpload
          v-if="logo?.onChange"
          :name="workspace.name"
          :src="workspace.logo"
          shape="square"
          :disabled="!canEdit"
          :on-change="logo.onChange as never"
          :on-remove="logo.onRemove"
          :accept="logo.accept"
          :max-size="logo.maxSize"
          :output-size="logo.outputSize"
          :output-type="logo.outputType"
          :labels="{ upload: t.picture }"
        />
        <NqField :invalid="!!nameError && dirty">
          <NqFieldLabel>{{ t.name }}</NqFieldLabel>
          <NqInput :model-value="name" :disabled="!canEdit || saving" @update:model-value="onName" />
          <NqFieldError v-if="nameError && dirty" match>{{ nameError }}</NqFieldError>
        </NqField>
        <NqWorkspaceSlugField v-model="slug" :label="t.slug" :prefix="slugPrefix" :state="state" :error="shownSlugError" :hint="hint" :disabled="!canEdit || saving" @edit="onSlugEdit" />
        <NqAlert v-if="notice" :tone="notice.tone" dismissible @dismiss="clearNotice">{{ notice.text }}</NqAlert>
      </form>
    </NqSettingsSection>

    <NqSettingsSection v-if="onLeave" :title="t.leaveTitle" :description="canLeave ? t.leaveBody : t.leaveBlocked">
      <NqConfirmButton variant="danger" :disabled="!canLeave" :title="t.leaveConfirmTitle(workspace.name)" :description="t.leaveConfirmBody" :confirm-label="t.leaveButton" :on-confirm="onLeave">
        <LogOut class="rtl:-scale-x-100" />{{ t.leaveButton }}
      </NqConfirmButton>
    </NqSettingsSection>

    <NqDangerZone v-if="onDelete && canDelete" :title="t.deleteTitle" :heading="t.deleteHeading" :description="t.deleteBody" :confirm-text="phrase" :on-delete="onDelete" :labels="deleteLabels" />
  </div>
</template>
