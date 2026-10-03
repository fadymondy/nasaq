<script setup lang="ts">
import { Comment, computed, getCurrentInstance, onBeforeUnmount, ref, Text, useSlots, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqHoverCard, NqHoverCardContent, NqHoverCardTrigger } from "../hover-card";
import type { PopupSide } from "../popover/popup";
import NqProfileCard from "./NqProfileCard.vue";
import { fill, STRINGS, type ProfileCardLabels } from "./strings";
import type { PersonProfile } from "./types";

// Wraps any avatar, name or @mention so a profile card opens from it: on hover, on keyboard focus, and on tap for touch
// (where there is no hover). Escape closes it. The default slot is the trigger: an element becomes the trigger itself
// (a link stays a link); text is wrapped in a button. `@message`, `@mention` and `@view-profile` add their buttons.
interface Props {
  person: PersonProfile;
  /** Your own time zone, to say how far apart you are. Default: the browser's. */
  viewerTimeZone?: string;
  /** Freeze the moment the local time is read at (docs, tests). Default: now. */
  now?: Date | number;
  labels?: Partial<ProfileCardLabels>;
  /** Ms before it opens on hover. Default 300. */
  delay?: number;
  closeDelay?: number;
  side?: PopupSide;
  align?: "start" | "center" | "end";
  /** Class of the card. */
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { delay: 300, closeDelay: 150, side: "bottom", align: "start" });
const emit = defineEmits<{ message: [person: PersonProfile]; mention: [person: PersonProfile]; viewProfile: [person: PersonProfile] }>();

const slots = useSlots();
const vnodeProps = getCurrentInstance()?.vnode.props ?? {};
const listeners: Record<string, (p: PersonProfile) => void> = {};
if (typeof vnodeProps.onMessage !== "undefined") listeners.onMessage = (p) => emit("message", p);
if (typeof vnodeProps.onMention !== "undefined") listeners.onMention = (p) => emit("mention", p);
if (typeof vnodeProps.onViewProfile !== "undefined") listeners.onViewProfile = (p) => emit("viewProfile", p);

const nq = useNasaq();
const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));

const open = ref(false);
let touched = false;
const triggerEl = ref<{ $el?: Element } | null>(null);

/** True when the slot is one element or component, which then becomes the trigger. */
function slotIsElement() {
  const nodes = (slots.default?.() ?? []).filter((n) => n.type !== Comment && !(n.type === Text && !String(n.children).trim()));
  return nodes.length === 1 && nodes[0]?.type !== Text;
}
const asChild = slotIsElement();

function onPointerDown(e: PointerEvent) {
  touched = e.pointerType === "touch" || e.pointerType === "pen";
}
function onClick(e: MouseEvent) {
  if (!touched) return;
  e.preventDefault();
  open.value = !open.value;
}

// A tap opened it, so a tap outside closes it (hover cards have no outside press of their own).
function close(e: PointerEvent) {
  const target = e.target as Element | null;
  if (target?.closest('[data-slot="hover-card-content"]') || triggerEl.value?.$el?.contains(target)) return;
  open.value = false;
}
watch(open, (isOpen) => {
  document.removeEventListener("pointerdown", close);
  if (isOpen && touched) document.addEventListener("pointerdown", close);
});
onBeforeUnmount(() => document.removeEventListener("pointerdown", close));
</script>

<template>
  <NqHoverCard :open="open" :delay="props.delay" :close-delay="props.closeDelay" @update:open="open = $event">
    <NqHoverCardTrigger
      ref="triggerEl"
      :as="asChild ? 'a' : 'button'"
      :as-child="asChild"
      :type="asChild ? undefined : 'button'"
      aria-haspopup="dialog"
      :class="asChild ? undefined : 'rounded-control text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus'"
      @pointerdown="onPointerDown"
      @click="onClick"
    >
      <slot />
    </NqHoverCardTrigger>
    <NqHoverCardContent :side="props.side" :align="props.align" :class="cn('w-80', props.class)" role="dialog" :aria-label="fill(t.profileOf, { name: props.person.name })">
      <NqProfileCard :person="props.person" :viewer-time-zone="props.viewerTimeZone" :now="props.now" :labels="props.labels" v-bind="listeners" />
    </NqHoverCardContent>
  </NqHoverCard>
</template>
