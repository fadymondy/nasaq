<script setup lang="ts">
import { Bot, Check, CornerDownRight, Pencil, Trash2, UserRound } from "lucide-vue-next";
import { computed, ref, type Component } from "vue";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import type { Mention, MentionOption } from "../mention-textarea";
import { NqDateTime } from "../numeric";
import NqCommentActionsMenu from "./NqCommentActionsMenu.vue";
import NqCommentBody from "./NqCommentBody.vue";
import NqCommentComposer from "./NqCommentComposer.vue";
import type { CommentAuthor, CommentAuthorKind, ThreadComment } from "./comment-thread-logic";
import { commentError, useCommentLabels, type CommentResult, type CommentThreadLabels } from "./strings";

// One comment: author, badges, body, actions (the "…" menu and the context menu), inline edit and delete confirmation.
interface Props {
  comment: ThreadComment;
  reply?: boolean;
  currentUser?: CommentAuthor;
  canModerate?: boolean;
  signedIn?: boolean;
  canPost?: boolean;
  suggestions?: MentionOption[];
  onEdit?: (id: string, body: string, mentions: Mention[]) => Promise<CommentResult>;
  onDelete?: (id: string) => Promise<CommentResult>;
  onApprove?: (id: string) => Promise<CommentResult>;
  labels?: CommentThreadLabels;
}
const props = withDefaults(defineProps<Props>(), { reply: false, signedIn: true, suggestions: () => [] });
const emit = defineEmits<{ reply: [] }>();
const { t } = useCommentLabels(() => props.labels);

const KIND_VIEW: Record<Exclude<CommentAuthorKind, "human">, { variant: "info" | "accent" | "neutral"; icon: Component }> = {
  agent: { variant: "accent", icon: Bot },
  client: { variant: "info", icon: UserRound },
  bot: { variant: "neutral", icon: Bot },
};

const editing = ref(false);
const confirming = ref(false);
const error = ref<string | null>(null);
const own = computed(() => !!props.currentUser && props.currentUser.id === props.comment.author.id);
const kind = computed(() => (props.comment.author.kind && props.comment.author.kind !== "human" ? KIND_VIEW[props.comment.author.kind] : null));
const canReply = computed(() => props.signedIn && !!props.canPost && !props.reply);

async function run(fn: () => Promise<CommentResult>) {
  error.value = null;
  const message = commentError(await fn());
  if (message) error.value = message;
  return !message;
}

const menu = computed(() => {
  const list: ContextMenuAction[] = [];
  const c = props.comment;
  if (c.pending && props.canModerate && props.onApprove) list.push({ id: "approve", label: t.value.approve, icon: Check, group: "review", onSelect: () => void run(() => props.onApprove!(c.id)) });
  if (props.onEdit && (own.value || props.canModerate)) list.push({ id: "edit", label: t.value.edit, icon: Pencil, group: "manage", onSelect: () => (editing.value = true) });
  if (props.onDelete && (own.value || props.canModerate)) list.push({ id: "delete", label: t.value.delete, icon: Trash2, danger: true, group: "danger", onSelect: () => (confirming.value = true) });
  return list;
});
const actions = computed<ContextMenuAction[]>(() => (canReply.value ? [{ id: "reply", label: t.value.reply, icon: CornerDownRight, onSelect: () => emit("reply") }, ...menu.value] : menu.value));

async function saveEdit(body: string, mentions: Mention[]) {
  const result = await (props.onEdit?.(props.comment.id, body, mentions) ?? Promise.resolve());
  if (!commentError(result)) editing.value = false;
  return result;
}
async function confirmDelete() {
  if (await run(() => props.onDelete?.(props.comment.id) ?? Promise.resolve())) confirming.value = false;
}
</script>

<template>
  <NqContextMenuActions :actions="actions" as="article" data-slot="comment" :data-pending="comment.pending ? '' : undefined" :aria-label="comment.author.name" :class="cn('-m-2 flex min-w-0 gap-3 rounded-card p-2', comment.pending && 'bg-nq-warning-soft/40')">
    <NqAvatar :name="comment.author.name" :src="comment.author.avatar" :size="reply ? 'sm' : 'md'" class="mt-0.5" />
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <header class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="text-label text-foreground">{{ comment.author.name }}</span>
        <NqBadge v-if="kind" :variant="kind.variant">
          <component :is="kind.icon" aria-hidden="true" />
          {{ t.kinds[comment.author.kind as CommentAuthorKind] }}
        </NqBadge>
        <NqBadge v-if="comment.pending" variant="warning">{{ t.pending }}</NqBadge>
        <NqDateTime :value="comment.createdAt" relative class="text-caption text-muted-foreground" />
        <span v-if="comment.editedAt" class="text-caption text-muted-foreground">({{ t.edited }})</span>
        <span class="ms-auto"><NqCommentActionsMenu :actions="menu" :label="t.actions(comment.author.name)" /></span>
      </header>
      <NqCommentComposer
        v-if="editing"
        :suggestions="suggestions"
        :initial-value="comment.body"
        :submit-label="t.save"
        autofocus
        cancelable
        :labels="labels"
        :on-submit="saveEdit"
        @cancel="editing = false"
      />
      <NqCommentBody v-else :body="comment.body" :mentions="comment.mentions" />
      <p v-if="comment.pending && !editing" class="text-caption text-muted-foreground">{{ t.pendingHint }}</p>
      <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
      <div v-if="confirming" role="alertdialog" :aria-label="t.confirmDelete" class="flex flex-wrap items-center gap-2 text-body-sm">
        <span class="text-foreground">{{ t.confirmDelete }}</span>
        <NqButton size="sm" variant="danger" @click="confirmDelete">{{ t.delete }}</NqButton>
        <NqButton size="sm" variant="ghost" @click="confirming = false">{{ t.cancel }}</NqButton>
      </div>
      <div v-if="!editing && canReply">
        <NqButton variant="ghost" size="sm" class="-ms-2 text-muted-foreground" @click="emit('reply')">
          <CornerDownRight aria-hidden="true" class="rtl:-scale-x-100" />
          {{ t.reply }}
        </NqButton>
      </div>
    </div>
  </NqContextMenuActions>
</template>
