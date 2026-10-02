<script setup lang="ts">
import { ref } from "vue";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";
import { NqButton } from "../button";
import { NqMentionTextarea, type Mention, type MentionOption } from "../mention-textarea";
import type { CommentAuthor } from "./comment-thread-logic";
import { commentError, useCommentLabels, type CommentResult, type CommentThreadLabels } from "./strings";

// The text box and button of a comment: mentions with @, Ctrl or Cmd + Enter to send. Return `{ error }` from `onSubmit` to
// keep the text and show the message.
interface Props {
  suggestions?: MentionOption[];
  onSubmit: (body: string, mentions: Mention[]) => Promise<CommentResult>;
  placeholder?: string;
  submitLabel?: string;
  initialValue?: string;
  /** Shows a Cancel button (replies and edits) and keeps the text after sending. */
  cancelable?: boolean;
  autofocus?: boolean;
  /** Who is writing, for the avatar. */
  author?: CommentAuthor;
  labels?: CommentThreadLabels;
  class?: string;
}
const props = withDefaults(defineProps<Props>(), { suggestions: () => [], initialValue: "" });
const emit = defineEmits<{ cancel: [] }>();
const { t } = useCommentLabels(() => props.labels);

const value = ref(props.initialValue);
const mentions = ref<Mention[]>([]);
const busy = ref(false);
const error = ref<string | null>(null);

async function send() {
  if (value.value.trim() === "" || busy.value) return;
  busy.value = true;
  error.value = null;
  const result = await props.onSubmit(value.value.trim(), mentions.value);
  busy.value = false;
  const message = commentError(result);
  if (message) {
    error.value = message;
    return;
  }
  if (!props.cancelable) {
    value.value = "";
    mentions.value = [];
  }
}
function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    void send();
  }
}
</script>

<template>
  <form data-slot="comment-composer" :class="cn('flex min-w-0 gap-3', props.class)" @submit.prevent="send">
    <NqAvatar v-if="props.author" :name="props.author.name" :src="props.author.avatar" size="md" class="mt-0.5" />
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      <NqMentionTextarea
        v-model="value"
        v-model:mentions="mentions"
        :aria-label="props.placeholder ?? t.write"
        :placeholder="props.placeholder ?? t.write"
        :suggestions="props.suggestions"
        :autofocus="props.autofocus"
        :rows="2"
        :disabled="busy"
        @keydown="onKeydown"
      />
      <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
      <div class="flex items-center justify-end gap-2">
        <NqButton v-if="props.cancelable" type="button" variant="ghost" size="sm" :disabled="busy" @click="emit('cancel')">{{ t.cancel }}</NqButton>
        <NqButton type="submit" variant="primary" size="sm" :loading="busy" :disabled="value.trim() === ''">{{ props.submitLabel ?? t.send }}</NqButton>
      </div>
    </div>
  </form>
</template>
