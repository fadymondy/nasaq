<script setup lang="ts">
import { ExternalLink, Link2, Plus } from "lucide-vue-next";
import { ref, useId } from "vue";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";
import { NqButton } from "../button";
import { NqCommentActionsMenu } from "../comment-thread";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqInput } from "../field";
import { NqNum } from "../numeric";
import { NqProgress } from "../progress";
import type { WorkStatus } from "../status-label-manager/status-label-logic";
import { issueSubProgress, type IssuePerson, type IssueRef, type IssueResult } from "./issue-logic";
import NqStatusDot from "./NqStatusDot.vue";
import type { IssueViewStrings } from "./strings";

// Sub-issues: done of total with a bar, a list with a context menu and "…" actions, and a row to add one.
const props = defineProps<{ items: IssueRef[]; statuses: WorkStatus[]; people: IssuePerson[]; onAdd?: (title: string) => Promise<IssueResult>; onOpen?: (id: string) => void; t: IssueViewStrings }>();
const heading = `${useId()}-h`;
const title = ref("");
const busy = ref(false);
const error = ref<string | null>(null);

const progress = () => issueSubProgress(props.items, props.statuses);
const statusOf = (id: string) => props.statuses.find((s) => s.id === id);
const personOf = (id: string | null | undefined) => (id ? props.people.find((p) => p.id === id) : undefined);

async function add() {
  const next = title.value.trim();
  if (!next || !props.onAdd) return;
  busy.value = true;
  const result = await props.onAdd(next);
  busy.value = false;
  if (result && "error" in result && result.error) {
    error.value = result.error;
    return;
  }
  error.value = null;
  title.value = "";
}

function actionsFor(item: IssueRef): ContextMenuAction[] {
  return [
    ...(props.onOpen ? [{ id: "open", label: props.t.open, icon: ExternalLink, onSelect: () => props.onOpen?.(item.id) }] : []),
    { id: "copy", label: props.t.copyKeyAction, icon: Link2, onSelect: () => void navigator.clipboard?.writeText(item.key) },
  ];
}
</script>

<template>
  <section data-slot="issue-sub-issues" :aria-labelledby="heading" class="flex min-w-0 flex-col gap-2">
    <div class="flex items-center justify-between gap-3">
      <h2 :id="heading" class="m-0 text-body font-semibold">{{ props.t.subIssues }}</h2>
      <span v-if="props.items.length > 0" class="text-body-sm text-muted-foreground"><NqNum :value="progress().done" /> / <NqNum :value="progress().total" /></span>
    </div>
    <NqProgress v-if="props.items.length > 0" :aria-label="props.t.subIssues" :value="progress().percent" size="sm" />
    <p v-if="props.items.length === 0" class="m-0 text-body-sm text-muted-foreground">{{ props.t.noSubIssues }}</p>
    <ul v-else class="m-0 flex list-none flex-col divide-y divide-border rounded-control border border-border p-0">
      <NqContextMenuActions v-for="item in props.items" :key="item.id" as="li" :actions="actionsFor(item)" class="flex min-w-0 items-center gap-2 px-3 py-2">
        <NqStatusDot :hue="statusOf(item.statusId)?.hue" />
        <bdi dir="ltr" class="shrink-0 font-mono text-caption text-muted-foreground">{{ item.key }}</bdi>
        <button
          type="button"
          :title="statusOf(item.statusId)?.name"
          :class="cn('min-w-0 flex-1 truncate text-start text-body-sm outline-none hover:underline focus-visible:underline', statusOf(item.statusId)?.stage === 'done' && 'text-muted-foreground line-through')"
          @click="props.onOpen?.(item.id)"
        >
          {{ item.title }}
        </button>
        <NqAvatar v-if="personOf(item.assigneeId)" :name="personOf(item.assigneeId)!.name" :src="personOf(item.assigneeId)!.avatar" size="xs" />
        <NqCommentActionsMenu :actions="actionsFor(item)" :label="`${props.t.actions}: ${item.key}`" />
      </NqContextMenuActions>
    </ul>
    <form v-if="props.onAdd" class="flex items-center gap-2" @submit.prevent="add">
      <NqInput v-model="title" :aria-label="props.t.subIssuePlaceholder" :placeholder="props.t.subIssuePlaceholder" :disabled="busy" />
      <NqButton type="submit" variant="secondary" :loading="busy" :disabled="!title.trim()">
        <Plus aria-hidden="true" />
        {{ props.t.addSubIssue }}
      </NqButton>
    </form>
    <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
  </section>
</template>
