<script setup lang="ts">
import { computed, getCurrentInstance, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqMentionChip from "./NqMentionChip.vue";
import { splitMentions, type MentionKind, type MentionRange, type PersonProfile } from "./types";

// Shows saved text with its mentions as chips.
interface Props {
  /** The text a mention textarea produced. */
  text: string;
  /** Its `mentions` array. */
  mentions: readonly MentionRange[];
  /** Finds the person behind a mention id, to give the chip a profile card. Teams and groups return their kind. */
  resolve?: (id: string) => { person?: PersonProfile; kind?: MentionKind } | undefined;
  viewerTimeZone?: string;
  now?: Date | number;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const emit = defineEmits<{ message: [person: PersonProfile]; mention: [person: PersonProfile]; viewProfile: [person: PersonProfile] }>();
defineOptions({ inheritAttrs: false });

const vnodeProps = getCurrentInstance()?.vnode.props ?? {};
const listeners: Record<string, (p: PersonProfile) => void> = {};
if (typeof vnodeProps.onMessage !== "undefined") listeners.onMessage = (p) => emit("message", p);
if (typeof vnodeProps.onMention !== "undefined") listeners.onMention = (p) => emit("mention", p);
if (typeof vnodeProps.onViewProfile !== "undefined") listeners.onViewProfile = (p) => emit("viewProfile", p);

const segments = computed(() => splitMentions(props.text, props.mentions));
</script>

<template>
  <p v-bind="$attrs" data-slot="mention-text" :class="cn('whitespace-pre-wrap text-body text-foreground', props.class)">
    <template v-for="(s, i) in segments" :key="i">
      <span v-if="s.type === 'text'">{{ s.text }}</span>
      <NqMentionChip
        v-else
        :name="s.mention.name"
        :kind="props.resolve?.(s.mention.id)?.kind"
        :person="props.resolve?.(s.mention.id)?.person"
        :viewer-time-zone="props.viewerTimeZone"
        :now="props.now"
        v-bind="listeners"
      />
    </template>
  </p>
</template>
