<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { defaultCurrency } from "../../lib/money";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqCard, NqCardContent } from "../card";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput } from "../field";
import { NqMembersManager } from "../members-manager";
import { formatNumber } from "../numeric";
import { NqMeter } from "../progress";
import type { ProjectStatus } from "../project-list";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSettingsSections } from "../settings-sections";
import type { SettingsGroup } from "../settings-sections/strings";
import { NqStatusLabelManager } from "../status-label-manager";
import type { WorkLabel, WorkStatus } from "../status-label-manager/status-label-logic";
import NqProjectDanger from "./NqProjectDanger.vue";
import NqProjectIntegrations from "./NqProjectIntegrations.vue";
import type { ProjectViewStrings } from "./strings";
import type { ProjectBudget, ProjectDetails, ProjectPatch, ProjectResult, ProjectSettingsExtras, ProjectWorkflow } from "./types";

// The Settings tab: details and budget forms, members, workflow, integrations and the danger zone.
const props = defineProps<{
  project: ProjectDetails;
  onSave?: (patch: ProjectPatch) => Promise<ProjectResult>;
  workflow?: ProjectWorkflow;
  statuses: readonly WorkStatus[];
  labels: readonly WorkLabel[];
  budget?: ProjectBudget | null;
  extras?: ProjectSettingsExtras;
  t: ProjectViewStrings;
}>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const draft = reactive({
  name: props.project.name,
  client: props.project.client ?? "",
  status: props.project.status as ProjectStatus,
  startDate: props.project.startDate ?? "",
  dueDate: props.project.dueDate ?? "",
  budget: props.project.budget != null ? String(props.project.budget) : "",
});
const busy = ref(false);
const error = ref<string | null>(null);
const saved = ref<string | null>(null);
const touch = () => {
  saved.value = null;
};

async function submit(message: string) {
  if (!draft.name.trim()) {
    error.value = props.t.name;
    return;
  }
  busy.value = true;
  const total = draft.budget.trim() === "" ? null : Number(draft.budget);
  const result = await props.onSave?.({
    name: draft.name.trim(),
    client: draft.client.trim() || undefined,
    status: draft.status,
    startDate: draft.startDate || null,
    dueDate: draft.dueDate || null,
    budget: total !== null && Number.isFinite(total) ? total : null,
  });
  busy.value = false;
  if (result && "error" in result && result.error) {
    error.value = result.error;
    return;
  }
  error.value = null;
  saved.value = message;
}

const currency = computed(() => props.budget?.currency ?? props.project.currency ?? defaultCurrency(locale.value));
const money = (n: number) => formatNumber(n, locale.value, { style: "currency", currency: currency.value, maximumFractionDigits: 0 });
const statusKeys = computed(() => Object.keys(props.t.statuses) as ProjectStatus[]);

const groups = computed<SettingsGroup[]>(() => {
  const t = props.t;
  const project: SettingsGroup["pages"][number][] = [];
  const team: SettingsGroup["pages"][number][] = [];
  const connections: SettingsGroup["pages"][number][] = [];
  const danger: SettingsGroup["pages"][number][] = [];
  if (props.onSave) {
    project.push({ id: "general", label: t.pageGeneral, description: t.pageGeneralHint, keywords: [t.name, t.client, t.status, t.startDate, t.dueDate] });
    project.push({ id: "budget", label: t.pageBudget, description: t.pageBudgetHint, keywords: [t.budgetTotal, t.currency] });
  }
  if (props.extras?.members) team.push({ id: "members", label: t.pageMembers, description: t.pageMembersHint });
  if (props.workflow) team.push({ id: "workflow", label: t.pageWorkflow, description: t.pageWorkflowHint });
  if (props.extras?.integrations) connections.push({ id: "integrations", label: t.pageIntegrations, description: t.pageIntegrationsHint });
  if (props.extras?.onArchive || props.extras?.onDelete) danger.push({ id: "danger", label: t.pageDanger, description: t.pageDangerHint, tone: "danger" });
  return [
    { id: "project", label: t.groupProject, pages: project },
    { id: "team", label: t.groupTeam, pages: team },
    { id: "connections", label: t.groupConnections, pages: connections },
    { id: "danger", label: t.pageDanger, pages: danger },
  ].filter((g) => g.pages.length > 0);
});
</script>

<template>
  <NqSettingsSections data-slot="project-settings" :title="props.t.settingsTitle" :description="null" :groups="groups">
    <template #general>
      <div class="@container">
        <NqCard>
          <NqCardContent class="pt-4">
            <form class="grid gap-4 @2xl:grid-cols-2" @submit.prevent="submit(props.t.saved)">
              <NqField :invalid="error === props.t.name">
                <NqFieldLabel>{{ props.t.name }}</NqFieldLabel>
                <NqInput v-model="draft.name" @update:model-value="touch" />
              </NqField>
              <NqField>
                <NqFieldLabel>{{ props.t.key }}</NqFieldLabel>
                <NqInput ltr readonly :model-value="props.project.key ?? ''" />
                <NqFieldDescription>{{ props.t.keyHint }}</NqFieldDescription>
              </NqField>
              <NqField>
                <NqFieldLabel>{{ props.t.client }}</NqFieldLabel>
                <NqInput v-model="draft.client" @update:model-value="touch" />
              </NqField>
              <div class="flex flex-col gap-1.5">
                <span class="text-label">{{ props.t.status }}</span>
                <NqSelect v-model="draft.status" @update:model-value="touch">
                  <NqSelectTrigger :aria-label="props.t.status"><NqSelectValue /></NqSelectTrigger>
                  <NqSelectContent>
                    <NqSelectItem v-for="s in statusKeys" :key="s" :value="s">{{ props.t.statuses[s] }}</NqSelectItem>
                  </NqSelectContent>
                </NqSelect>
              </div>
              <NqField>
                <NqFieldLabel>{{ props.t.startDate }}</NqFieldLabel>
                <NqInput v-model="draft.startDate" ltr type="date" @update:model-value="touch" />
              </NqField>
              <NqField>
                <NqFieldLabel>{{ props.t.dueDate }}</NqFieldLabel>
                <NqInput v-model="draft.dueDate" ltr type="date" @update:model-value="touch" />
              </NqField>
              <div class="flex items-center gap-3 @2xl:col-span-2">
                <NqButton type="submit" :loading="busy" :disabled="!props.onSave">{{ props.t.save }}</NqButton>
                <span v-if="saved" role="status" class="text-body-sm text-muted-foreground">{{ saved }}</span>
                <span v-if="error && error !== props.t.name" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</span>
              </div>
            </form>
          </NqCardContent>
        </NqCard>
      </div>
    </template>
    <template #budget>
      <div class="@container">
        <NqCard>
          <NqCardContent class="flex flex-col gap-4 pt-4">
            <form class="grid gap-4 @2xl:grid-cols-2" @submit.prevent="submit(props.t.budgetSaved)">
              <NqField>
                <NqFieldLabel>{{ props.t.budgetTotal }}</NqFieldLabel>
                <NqInput v-model="draft.budget" ltr inputmode="decimal" @update:model-value="touch" />
              </NqField>
              <NqField>
                <NqFieldLabel>{{ props.t.currency }}</NqFieldLabel>
                <NqInput ltr readonly :model-value="currency" />
              </NqField>
              <div class="flex items-center gap-3 @2xl:col-span-2">
                <NqButton type="submit" :loading="busy" :disabled="!props.onSave">{{ props.t.save }}</NqButton>
                <span v-if="saved" role="status" class="text-body-sm text-muted-foreground">{{ saved }}</span>
                <span v-if="error && error !== props.t.name" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</span>
              </div>
            </form>
            <div v-if="props.budget" class="flex flex-col gap-2 border-t border-border pt-4">
              <NqMeter :aria-label="props.t.budgetSpent" :value="Math.min(props.budget.spent, props.budget.total)" :max="props.budget.total" size="md" :show-value="false" />
              <p class="m-0 text-body-sm text-muted-foreground">
                {{ props.t.budgetSpent }}: <bdi class="text-foreground">{{ money(props.budget.spent) }}</bdi> / <bdi>{{ money(props.budget.total) }}</bdi>
              </p>
            </div>
          </NqCardContent>
        </NqCard>
      </div>
    </template>
    <template #members>
      <NqMembersManager v-if="props.extras?.members" v-bind="props.extras.members" />
    </template>
    <template #workflow>
      <NqStatusLabelManager v-if="props.workflow" :statuses="props.statuses as WorkStatus[]" :labels="props.labels as WorkLabel[]" v-bind="props.workflow" />
    </template>
    <template #integrations>
      <NqProjectIntegrations v-if="props.extras?.integrations" :integrations="props.extras.integrations" :on-toggle="props.extras.onToggleIntegration" :t="props.t" />
    </template>
    <template #danger>
      <NqProjectDanger :project-key="props.project.key ?? props.project.name" :archived="props.project.status === 'archived'" :on-archive="props.extras?.onArchive" :on-delete="props.extras?.onDelete" :t="props.t" />
    </template>
  </NqSettingsSections>
</template>
