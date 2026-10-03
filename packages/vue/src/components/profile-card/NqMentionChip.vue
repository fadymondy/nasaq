<script setup lang="ts">
import { Users } from "lucide-vue-next";
import { getCurrentInstance, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqProfileHoverCard from "./NqProfileHoverCard.vue";
import type { ProfileCardLabels } from "./strings";
import type { MentionKind, PersonProfile } from "./types";

// An inline `@name` in a comment or message. With `person` it opens their profile card on hover, focus and tap.
// Teams and groups get an icon and no profile card.
interface Props {
  /** The name after the `@`. */
  name: string;
  /** Teams and groups get an icon and no profile card. Default `person`. */
  kind?: MentionKind;
  /** Passing the person opens their profile card from the chip. */
  person?: PersonProfile;
  viewerTimeZone?: string;
  now?: Date | number;
  labels?: Partial<ProfileCardLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { kind: "person" });
const emit = defineEmits<{ message: [person: PersonProfile]; mention: [person: PersonProfile]; viewProfile: [person: PersonProfile] }>();
defineOptions({ inheritAttrs: false });

const vnodeProps = getCurrentInstance()?.vnode.props ?? {};
const listeners: Record<string, (p: PersonProfile) => void> = {};
if (typeof vnodeProps.onMessage !== "undefined") listeners.onMessage = (p) => emit("message", p);
if (typeof vnodeProps.onMention !== "undefined") listeners.onMention = (p) => emit("mention", p);
if (typeof vnodeProps.onViewProfile !== "undefined") listeners.onViewProfile = (p) => emit("viewProfile", p);

const chipClass =
  "inline-flex max-w-full items-center gap-1 rounded-control bg-nq-selected px-1.5 py-px align-baseline text-body-sm font-medium text-foreground outline-none [&_svg]:size-3.5 [&_svg]:shrink-0";
</script>

<template>
  <span v-if="!props.person || props.kind !== 'person'" v-bind="$attrs" data-slot="mention-chip" :data-kind="props.kind" :class="cn(chipClass, props.class)">
    <Users v-if="props.kind !== 'person'" aria-hidden="true" />
    <span class="truncate">@{{ props.name }}</span>
  </span>
  <NqProfileHoverCard v-else :person="props.person" :viewer-time-zone="props.viewerTimeZone" :now="props.now" :labels="props.labels" v-bind="listeners">
    <span
      v-bind="$attrs"
      data-slot="mention-chip"
      :data-kind="props.kind"
      tabindex="0"
      role="button"
      :class="cn(chipClass, 'cursor-pointer hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus', props.class)"
    >
      <span class="truncate">@{{ props.name }}</span>
    </span>
  </NqProfileHoverCard>
</template>
