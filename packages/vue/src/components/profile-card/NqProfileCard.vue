<script setup lang="ts">
import { AtSign, MessageSquare, UserRound, Users } from "lucide-vue-next";
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import NqPresenceAvatar from "./NqPresenceAvatar.vue";
import NqPresenceDot from "./NqPresenceDot.vue";
import { describeOffset, isNightIn, isTimeZone, localTimeLabel, offsetFrom } from "./profile-model";
import { offsetText, STRINGS, type ProfileCardLabels } from "./strings";
import type { PersonProfile } from "./types";

// The account card: avatar with presence, name, role, custom status, local time (and how far it is from yours), teams and
// quick actions. It is the body of NqProfileHoverCard and also stands alone in the user menu, member lists and profile pages.
// Listen to `@message`, `@mention` and `@view-profile` to add each button; the default slot adds more content under the details.
interface Props {
  person: PersonProfile;
  /** Your own time zone, to say how far apart you are. Default: the browser's. */
  viewerTimeZone?: string;
  /** Freeze the moment the local time is read at (docs, tests). Default: now. */
  now?: Date | number;
  labels?: Partial<ProfileCardLabels>;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const emit = defineEmits<{ message: [person: PersonProfile]; mention: [person: PersonProfile]; viewProfile: [person: PersonProfile] }>();
defineOptions({ inheritAttrs: false });

const vnodeProps = getCurrentInstance()?.vnode.props ?? {};
const has = (name: string) => typeof vnodeProps[name] !== "undefined";
const actions = { message: has("onMessage"), mention: has("onMention"), viewProfile: has("onViewProfile") };
const anyAction = actions.message || actions.mention || actions.viewProfile;

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => ({ ...STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));

const tick = ref<number | null>(props.now === undefined ? null : new Date(props.now).getTime());
let timer: ReturnType<typeof setInterval> | undefined;
function start() {
  clearInterval(timer);
  if (props.now !== undefined) {
    tick.value = new Date(props.now).getTime();
    return;
  }
  tick.value = Date.now();
  timer = setInterval(() => (tick.value = Date.now()), 30_000);
}
onMounted(start);
watch(() => props.now, start);
onBeforeUnmount(() => clearInterval(timer));

const zone = computed(() => (props.person.timeZone && isTimeZone(props.person.timeZone) ? props.person.timeZone : undefined));
const yours = computed(() => (props.viewerTimeZone && isTimeZone(props.viewerTimeZone) ? props.viewerTimeZone : Intl.DateTimeFormat().resolvedOptions().timeZone));
const time = computed(() => (zone.value && tick.value !== null ? localTimeLabel(zone.value, tick.value, locale.value) : ""));
const diff = computed(() => (zone.value && tick.value !== null ? offsetFrom(zone.value, yours.value, tick.value) : null));
const night = computed(() => (zone.value && tick.value !== null ? isNightIn(zone.value, tick.value) : false));
const offset = computed(() => (diff.value === null ? "" : offsetText(t.value, describeOffset(diff.value))));
const teams = computed(() => props.person.teams ?? []);
</script>

<template>
  <div v-bind="$attrs" data-slot="profile-card" :data-presence="props.person.presence" :class="cn('flex min-w-0 flex-col gap-3 text-start', props.class)">
    <div class="flex items-start gap-3">
      <NqPresenceAvatar :person="props.person" size="lg" />
      <div class="flex min-w-0 flex-1 flex-col">
        <p class="truncate text-label text-foreground">{{ props.person.name }}</p>
        <bdi v-if="props.person.handle" dir="ltr" class="truncate text-caption text-muted-foreground">@{{ props.person.handle }}</bdi>
        <p v-if="props.person.role" class="truncate text-caption text-muted-foreground">{{ props.person.role }}</p>
      </div>
    </div>

    <dl class="m-0 flex flex-col gap-1.5 text-caption text-muted-foreground">
      <div v-if="props.person.presence" class="flex items-center gap-2">
        <dt class="sr-only">{{ t[props.person.presence] }}</dt>
        <dd class="m-0 flex min-w-0 items-center gap-2">
          <NqPresenceDot :presence="props.person.presence" decorative />
          <span class="truncate text-foreground">{{ props.person.statusText ?? t[props.person.presence] }}</span>
        </dd>
      </div>
      <div v-if="zone && time && diff !== null" class="flex items-baseline gap-2">
        <dt class="sr-only">{{ t.localTime }}</dt>
        <dd class="m-0 flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span dir="ltr" class="text-foreground tabular-nums">{{ time }}</span>
          <span>{{ night ? `${offset} · ${t.night}` : offset }}</span>
        </dd>
      </div>
      <div v-if="teams.length" class="flex items-center gap-2">
        <dt class="sr-only">{{ teams.length > 1 ? t.teams : t.team }}</dt>
        <dd class="m-0 flex min-w-0 items-center gap-2">
          <Users aria-hidden="true" class="size-3.5 shrink-0" />
          <span class="truncate">{{ teams.join(" · ") }}</span>
        </dd>
      </div>
      <div v-if="props.person.email">
        <dt class="sr-only">{{ t.email }}</dt>
        <dd class="m-0 truncate"><bdi dir="ltr">{{ props.person.email }}</bdi></dd>
      </div>
    </dl>

    <slot />

    <div v-if="anyAction" data-slot="profile-card-actions" class="flex flex-wrap gap-2">
      <NqButton v-if="actions.message" size="sm" variant="primary" @click="emit('message', props.person)">
        <MessageSquare aria-hidden="true" />
        {{ t.message }}
      </NqButton>
      <NqButton v-if="actions.mention" size="sm" @click="emit('mention', props.person)">
        <AtSign aria-hidden="true" />
        {{ t.mention }}
      </NqButton>
      <NqButton v-if="actions.viewProfile" size="sm" variant="ghost" @click="emit('viewProfile', props.person)">
        <UserRound aria-hidden="true" />
        {{ t.viewProfile }}
      </NqButton>
    </div>
  </div>
</template>
