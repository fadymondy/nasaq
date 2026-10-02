<script setup lang="ts">
import { LogIn, MessageSquare } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import type { Mention, MentionOption } from "../mention-textarea";
import { formatNumber, NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import NqCommentComposer from "./NqCommentComposer.vue";
import NqCommentItem from "./NqCommentItem.vue";
import { buildThread, type CommentAuthor, type CommentMention, type ThreadComment } from "./comment-thread-logic";
import { commentError, useCommentLabels, type CommentResult, type CommentThreadLabels } from "./strings";

// A conversation: comments with one level of replies, @mentions shown as chips, author-kind badges (agent, client, bot), a
// "pending review" state with Approve for moderators, edit and delete on your own comments, and a sign-in prompt when signed
// out. Every comment action is also on its context menu (context-click, Shift+F10).
export interface CommentInput {
  body: string;
  mentions: CommentMention[];
  /** Set when replying. */
  parentId?: string;
}

interface Props {
  /** Flat list. `parentId` makes a reply. Any order: threads are built oldest first. */
  comments: ThreadComment[];
  /** The signed-in user. Their comments can be edited and deleted. */
  currentUser?: CommentAuthor;
  /** False shows a sign-in prompt instead of the composer. Default true. */
  signedIn?: boolean;
  /** People offered by @ in the composer. */
  suggestions?: MentionOption[];
  /** Post a comment or a reply. Return `{ error }` to keep the text and show the message. Omit for a read-only thread. */
  onSubmit?: (input: CommentInput) => Promise<CommentResult>;
  /** Save an edit. Omit to hide Edit. */
  onEdit?: (id: string, body: string, mentions: Mention[]) => Promise<CommentResult>;
  /** Delete a comment. Omit to hide Delete. */
  onDelete?: (id: string) => Promise<CommentResult>;
  /** Approve a comment awaiting review. Only shown when `canModerate` is set. */
  onApprove?: (id: string) => Promise<CommentResult>;
  /** Moderators get Approve on pending comments and may edit or delete any comment. */
  canModerate?: boolean;
  onSignIn?: () => void;
  /** Hide the heading with the count. */
  hideHeader?: boolean;
  labels?: CommentThreadLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { signedIn: true, suggestions: () => [] });
const { t, locale } = useCommentLabels(() => props.labels);

const threads = computed(() => buildThread(props.comments));
const replyTo = ref<string | null>(null);
const strip = (mentions: Mention[]) => mentions.map(({ id, name }) => ({ id, name }));

async function post(body: string, mentions: Mention[], parentId?: string) {
  const result = await props.onSubmit!({ body, mentions: strip(mentions), ...(parentId ? { parentId } : {}) });
  if (parentId && !commentError(result)) replyTo.value = null;
  return result;
}
const itemProps = computed(() => ({
  currentUser: props.currentUser,
  canModerate: props.canModerate,
  signedIn: props.signedIn,
  canPost: !!props.onSubmit,
  suggestions: props.suggestions,
  onEdit: props.onEdit,
  onDelete: props.onDelete,
  onApprove: props.onApprove,
  labels: props.labels,
}));
</script>

<template>
  <section data-slot="comment-thread" :aria-label="t.threadLabel" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <h3 v-if="!hideHeader" class="flex items-center gap-2 text-label text-foreground">
      <MessageSquare aria-hidden="true" class="size-4 text-muted-foreground" />
      {{ t.title }}
      <NqBadge variant="outline"><NqNum :value="comments.length" /></NqBadge>
    </h3>
    <NqEmptyState v-if="threads.length === 0" :icon="MessageSquare" :title="t.empty" :description="t.emptyHint" />
    <ol v-else class="m-0 flex list-none flex-col gap-5 p-0">
      <li v-for="{ comment, replies } in threads" :key="comment.id" class="flex min-w-0 flex-col gap-3">
        <NqCommentItem :comment="comment" v-bind="itemProps" @reply="replyTo = comment.id" />
        <ol v-if="replies.length > 0 || replyTo === comment.id" :aria-label="t.replies(formatNumber(replies.length, locale))" class="m-0 ms-4 flex list-none flex-col gap-3 border-s border-border p-0 ps-4">
          <li v-for="r in replies" :key="r.id">
            <NqCommentItem :comment="r" reply v-bind="itemProps" @reply="replyTo = comment.id" />
          </li>
          <li v-if="replyTo === comment.id && onSubmit">
            <NqCommentComposer
              autofocus
              cancelable
              :author="currentUser"
              :suggestions="suggestions"
              :placeholder="t.writeReply"
              :submit-label="t.reply"
              :labels="labels"
              :on-submit="(body, mentions) => post(body, mentions, comment.id)"
              @cancel="replyTo = null"
            />
          </li>
        </ol>
      </li>
    </ol>
    <template v-if="onSubmit">
      <NqCommentComposer v-if="signedIn" :author="currentUser" :suggestions="suggestions" :labels="labels" :on-submit="(body, mentions) => post(body, mentions)" />
      <div v-else data-slot="comment-signin" class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-border p-4">
        <div class="flex min-w-0 flex-col gap-0.5">
          <span class="text-label text-foreground">{{ t.signIn }}</span>
          <span class="text-body-sm text-muted-foreground">{{ t.signInHint }}</span>
        </div>
        <NqButton variant="primary" @click="onSignIn?.()">
          <LogIn aria-hidden="true" class="rtl:-scale-x-100" />
          {{ t.signInAction }}
        </NqButton>
      </div>
    </template>
  </section>
</template>
