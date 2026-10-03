<script setup lang="ts">
import { Bot, Plug, Trash2 } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqSettingsSection } from "../account-settings";
import { NqAlert } from "../alert";
import { NqConfirmButton } from "../alert-dialog";
import { NqApiKeys } from "../api-keys";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { formatNumber, NqDateTime } from "../numeric";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState } from "../states";
import { NqTooltip } from "../tooltip";
import { type AccessLevel, ACCESS_LEVELS, type GrantMatrix, grantCounts, isReadOnlyApp, levelOf, setLevel, summarizeScopes } from "./access-rules";
import { accessGrantsStrings, type AccessGrantsLabels } from "./strings";
import type { AccessGrantsAgentKeys, AccessResource, ConnectedApp } from "./types";

// Who and what can act for you. A list of authorized apps and agents per workspace with their scopes and a revoke
// button, delegated agent keys (built on NqApiKeys), and a matrix of agents by resource where each cell is no
// access, read or read and write. Cell changes save at once and roll back on failure.
interface Props {
  apps: readonly ConnectedApp[];
  /** Friendly names for scope ids. Unknown ids show as they are. */
  scopeLabels?: Record<string, string>;
  /** Workspaces, to filter the list. Shown when there is more than one. */
  organizations?: readonly { id: string; name: string }[];
  /** Cut off an app or agent. Resolve `{ error }` (or throw) to show a failure. */
  onRevoke?: (app: ConnectedApp) => Promise<void | { error?: string }>;
  /** Resources agents can be given access to, as matrix columns. */
  resources?: readonly AccessResource[];
  grants?: GrantMatrix;
  /** Change one cell. The screen updates at once and goes back if this rejects or resolves `{ error }`. */
  onChangeGrant?: (agentId: string, resourceId: string, level: AccessLevel) => Promise<void | { error?: string }>;
  /** Delegated agent keys, rendered with NqApiKeys. Omit to hide the section. */
  agentKeys?: AccessGrantsAgentKeys;
  /** Show only some sections. Default all. */
  sections?: readonly ("apps" | "keys" | "grants")[];
  labels?: AccessGrantsLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  scopeLabels: undefined,
  organizations: undefined,
  onRevoke: undefined,
  resources: () => [],
  grants: () => ({}),
  onChangeGrant: undefined,
  agentKeys: undefined,
  sections: () => ["apps", "keys", "grants"],
  labels: undefined,
});

const nasaq = useNasaq();
const t = computed(() => ({ ...accessGrantsStrings(nasaq.locale.value), ...props.labels }));
const org = ref("all");
const notice = ref<{ tone: "success" | "danger"; text: string } | null>(null);
const draft = ref<GrantMatrix>(props.grants);
const busy = ref<string | null>(null);
let saved: GrantMatrix = props.grants;
watch(
  () => props.grants,
  (g) => {
    saved = g;
    draft.value = g;
  },
);

const has = (s: "apps" | "keys" | "grants") => props.sections.includes(s);
const visible = computed(() => (org.value === "all" ? props.apps : props.apps.filter((a) => a.orgId === org.value)));
const agents = computed(() => visible.value.filter((a) => a.kind === "agent"));
const resourceIds = computed(() => props.resources.map((r) => r.id));
const scopeName = (id: string) => props.scopeLabels?.[id] ?? id;
const num = (n: number) => formatNumber(n, nasaq.locale.value);
const orgName = (id?: string) => props.organizations?.find((o) => o.id === id)?.name;
const meta = (a: ConnectedApp) => [a.publisher, org.value === "all" ? orgName(a.orgId) : null].filter(Boolean).join(" · ");
const counts = (agentId: string) => grantCounts(draft.value, agentId, resourceIds.value);

async function revoke(app: ConnectedApp) {
  notice.value = null;
  try {
    const r = await props.onRevoke?.(app);
    if (r && typeof r === "object" && r.error) notice.value = { tone: "danger", text: r.error };
    else notice.value = { tone: "success", text: t.value.revoked(app.name) };
  } catch {
    notice.value = { tone: "danger", text: t.value.revokeFailed };
  }
}

async function change(agent: ConnectedApp, resource: AccessResource, level: AccessLevel) {
  const key = `${agent.id}:${resource.id}`;
  const before = saved;
  draft.value = setLevel(draft.value, agent.id, resource.id, level);
  busy.value = key;
  notice.value = null;
  try {
    const r = await props.onChangeGrant?.(agent.id, resource.id, level);
    if (r && typeof r === "object" && r.error) throw new Error(r.error);
    saved = setLevel(saved, agent.id, resource.id, level);
  } catch (e) {
    draft.value = setLevel(draft.value, agent.id, resource.id, levelOf(before, agent.id, resource.id));
    notice.value = { tone: "danger", text: e instanceof Error && e.message ? e.message : t.value.grantFailed };
  } finally {
    if (busy.value === key) busy.value = null;
  }
}
</script>

<template>
  <div data-slot="access-grants" :class="cn('flex flex-col gap-6', props.class)">
    <NqAlert v-if="notice" :tone="notice.tone" :role="notice.tone === 'danger' ? 'alert' : 'status'" dismissible :dismiss-label="t.dismiss" @dismiss="notice = null">{{ notice.text }}</NqAlert>

    <NqSettingsSection v-if="has('apps')" :title="t.appsTitle" :description="t.appsBody">
      <template v-if="props.organizations && props.organizations.length > 1" #action>
        <NqSelect :model-value="org" @update:model-value="(v: string | number | null) => v && (org = String(v))">
          <NqSelectTrigger :aria-label="t.workspace" class="w-48"><NqSelectValue /></NqSelectTrigger>
          <NqSelectContent>
            <NqSelectItem value="all">{{ t.allWorkspaces }}</NqSelectItem>
            <NqSelectItem v-for="o in props.organizations" :key="o.id" :value="o.id">{{ o.name }}</NqSelectItem>
          </NqSelectContent>
        </NqSelect>
      </template>
      <ul v-if="visible.length" :aria-label="t.appsLabel" data-slot="access-apps" class="flex flex-col divide-y divide-border rounded-card border border-border">
        <li v-for="a in visible" :key="a.id" class="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3">
          <NqAvatar :name="a.name" :src="a.logo" shape="square" size="lg" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <div class="flex flex-wrap items-center gap-2">
              <span class="truncate text-label text-foreground">{{ a.name }}</span>
              <NqBadge :variant="a.kind === 'agent' ? 'accent' : 'neutral'">
                <Bot v-if="a.kind === 'agent'" aria-hidden="true" />
                <Plug v-else aria-hidden="true" />
                {{ a.kind === "agent" ? t.agent : t.app }}
              </NqBadge>
              <NqBadge v-if="isReadOnlyApp(a.scopes) && a.scopes.length" variant="info">{{ t.readOnly }}</NqBadge>
            </div>
            <p class="text-caption text-muted-foreground">{{ meta(a) }}</p>
            <div class="flex flex-wrap gap-1.5">
              <template v-if="summarizeScopes(a.scopes, 3).shown.length">
                <NqBadge v-for="s in summarizeScopes(a.scopes, 3).shown" :key="s" variant="outline">{{ scopeName(s) }}</NqBadge>
              </template>
              <span v-else class="text-caption text-muted-foreground">{{ t.noScopes }}</span>
              <NqTooltip v-if="summarizeScopes(a.scopes, 3).more > 0" :content="a.scopes.slice(3).map(scopeName).join(', ')">
                <NqBadge variant="outline" tabindex="0">{{ t.scopesMore(num(summarizeScopes(a.scopes, 3).more)) }}</NqBadge>
              </NqTooltip>
            </div>
            <p class="text-caption text-muted-foreground">
              {{ t.authorized }} <NqDateTime :value="a.authorizedAt" :format="{ dateStyle: 'medium' }" /> · {{ t.lastUsed }}
              <NqDateTime v-if="a.lastUsedAt" :value="a.lastUsedAt" relative />
              <template v-else>{{ t.neverUsed }}</template>
            </p>
          </div>
          <NqConfirmButton v-if="props.onRevoke" size="sm" variant="secondary" :title="t.revokeTitle(a.name)" :description="t.revokeBody" :confirm-label="t.revoke" :on-confirm="() => revoke(a)">
            <Trash2 />
            {{ t.revoke }}
          </NqConfirmButton>
        </li>
      </ul>
      <NqEmptyState v-else :title="t.appsEmpty" :description="t.appsEmptyHint" />
    </NqSettingsSection>

    <NqApiKeys
      v-if="has('keys') && props.agentKeys"
      v-bind="props.agentKeys"
      data-slot="access-agent-keys"
      :labels="{ title: t.keysTitle, description: t.keysBody, create: t.keysCreate, emptyTitle: t.keysEmptyTitle, emptyBody: t.keysEmptyBody, createTitle: t.keysCreateTitle, ...props.agentKeys.labels }"
    />

    <NqSettingsSection v-if="has('grants') && props.resources.length" :title="t.grantsTitle" :description="t.grantsBody">
      <div v-if="agents.length" class="overflow-x-auto">
        <table data-slot="access-matrix" :aria-label="t.grantsLabel" class="w-full min-w-[32rem] border-collapse text-body-sm">
          <thead>
            <tr class="border-b border-border">
              <th scope="col" class="py-2 pe-3 text-start text-caption font-medium text-muted-foreground">{{ t.agentColumn }}</th>
              <th v-for="r in props.resources" :key="r.id" scope="col" class="px-2 py-2 text-start text-label text-foreground">{{ r.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in agents" :key="a.id" class="border-b border-border last:border-b-0">
              <th scope="row" class="py-3 pe-3 text-start font-normal">
                <span class="block text-label text-foreground">{{ a.name }}</span>
                <span class="block text-caption text-muted-foreground">{{ t.summary(num(counts(a.id).read), num(counts(a.id).write)) }}</span>
              </th>
              <td v-for="r in props.resources" :key="r.id" class="px-2 py-3">
                <NqSelect
                  :model-value="levelOf(draft, a.id, r.id)"
                  :disabled="!props.onChangeGrant || busy === `${a.id}:${r.id}`"
                  @update:model-value="(v: string | number | null) => v && change(a, r, v as AccessLevel)"
                >
                  <NqSelectTrigger :aria-label="t.cell(a.name, r.label)" :data-level="levelOf(draft, a.id, r.id)" :class="cn('h-control-sm min-w-32', levelOf(draft, a.id, r.id) === 'none' && 'text-muted-foreground')">
                    <NqSelectValue />
                  </NqSelectTrigger>
                  <NqSelectContent>
                    <NqSelectItem v-for="l in ACCESS_LEVELS" :key="l" :value="l">{{ t.levels[l] }}</NqSelectItem>
                  </NqSelectContent>
                </NqSelect>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <NqEmptyState v-else :icon="Bot" :title="t.grantsEmpty" :description="t.grantsEmptyHint" />
    </NqSettingsSection>
  </div>
</template>
