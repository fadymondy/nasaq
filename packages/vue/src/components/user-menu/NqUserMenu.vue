<script setup lang="ts">
import { ChevronsUpDown, Languages, LogOut, Palette } from "lucide-vue-next";
import { computed, getCurrentInstance, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { useSidebarCollapsed } from "../app-shell";
import { NqAvatar } from "../avatar";
import {
  NqDropdownMenu,
  NqDropdownMenuContent,
  NqDropdownMenuGroup,
  NqDropdownMenuItem,
  NqDropdownMenuSeparator,
  NqDropdownMenuSub,
  NqDropdownMenuSubContent,
  NqDropdownMenuSubTrigger,
  NqDropdownMenuTrigger,
} from "../dropdown-menu";
import { NqPresenceAvatar, NqProfileCard, type PersonProfile } from "../profile-card";
import { NqLocaleMenuItems, NqThemeMenuItems, useThemeLabels } from "../switchers";

export interface UserMenuUser {
  name: string;
  email: string;
  avatar?: string;
}

// Avatar menu at the bottom of the sidebar (shadcn NavUser): account items in the default slot, theme, language, sign out.
// Listen to `@sign-out` to add the Sign out item and `@view-profile` for "View profile" on the profile card.
interface Props {
  user: UserMenuUser;
  /** Adds the Theme and Language submenus. Default true. */
  preferences?: boolean;
  /** The account card: passing the person swaps the plain name and email header for a profile card (presence, role, status, local time, teams) and puts a presence dot on the avatar. */
  profile?: PersonProfile;
  labels?: { theme?: string; language?: string; signOut?: string };
  /** `sidebar` (default): the name and email card at the bottom of the sidebar. `avatar`: just the avatar, for a top bar; the menu opens below it. */
  variant?: "sidebar" | "avatar";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { preferences: true, profile: undefined, labels: undefined, variant: "sidebar" });
const emit = defineEmits<{ signOut: []; viewProfile: [person: PersonProfile] }>();
const vnodeProps = getCurrentInstance()?.vnode.props ?? {};
const hasSignOut = typeof vnodeProps.onSignOut !== "undefined";
const hasViewProfile = typeof vnodeProps.onViewProfile !== "undefined";

const railState = useSidebarCollapsed();
const rail = computed(() => Boolean(railState.value)); // tolerate the plain-object fallback outside an app shell
const nq = useNasaq();
const themeLabels = useThemeLabels();
const top = computed(() => props.variant === "avatar");
const collapsed = computed(() => rail.value || top.value);
const ar = computed(() => nq.locale.value.startsWith("ar"));
const t = computed(() => ({
  theme: props.labels?.theme ?? themeLabels.group,
  language: props.labels?.language ?? (ar.value ? "اللغة" : "Language"),
  signOut: props.labels?.signOut ?? (ar.value ? "تسجيل الخروج" : "Sign out"),
}));
const avatarSize = computed(() => (collapsed.value ? "sm" : "md"));
const cardPerson = computed(() => (props.profile ? { ...props.profile, email: props.profile.email ?? props.user.email, avatar: props.profile.avatar ?? props.user.avatar } : null));
</script>

<template>
  <NqDropdownMenu>
    <NqDropdownMenuTrigger
      data-slot="user-menu"
      :aria-label="collapsed ? props.user.name : undefined"
      :class="
        cn(
          'flex w-full items-center gap-2 rounded-control px-1.5 outline-none',
          'transition-colors duration-150 ease-nq hover:bg-nq-hover data-popup-open:bg-nq-selected',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
          top
            ? 'size-control justify-center rounded-full px-0'
            : collapsed
              ? 'size-control justify-center px-0'
              : 'min-h-[calc(var(--spacing-nav-row)+12px)] border border-border bg-background/60 py-1 shadow-xs hover:border-nq-line-strong',
          props.class,
        )
      "
    >
      <NqPresenceAvatar
        v-if="props.profile?.presence"
        :person="{ ...props.profile, name: props.user.name, avatar: props.user.avatar ?? props.profile.avatar }"
        :size="avatarSize"
      />
      <NqAvatar v-else :name="props.user.name" :src="props.user.avatar" :size="avatarSize" />
      <template v-if="!collapsed">
        <span class="grid min-w-0 flex-1 text-start">
          <span class="truncate text-label leading-snug text-foreground">{{ props.user.name }}</span>
          <span class="truncate text-caption leading-snug text-muted-foreground"><bdi dir="ltr">{{ props.user.email }}</bdi></span>
        </span>
        <ChevronsUpDown aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
      </template>
    </NqDropdownMenuTrigger>
    <NqDropdownMenuContent
      :side="top ? 'bottom' : collapsed ? 'inline-end' : 'top'"
      :align="collapsed ? 'end' : 'start'"
      :style="{ '--anchor-width': 'var(--reka-dropdown-menu-trigger-width)' }"
      :class="cn('w-60', !collapsed && 'w-[max(15rem,var(--anchor-width))]')"
    >
      <NqProfileCard
        v-if="cardPerson"
        data-slot="user-menu-profile"
        :person="cardPerson"
        class="p-2"
        v-bind="hasViewProfile ? { onViewProfile: (person: PersonProfile) => emit('viewProfile', person) } : {}"
      />
      <div v-else class="flex items-center gap-2 px-2 py-2">
        <NqAvatar :name="props.user.name" :src="props.user.avatar" />
        <span class="grid min-w-0 flex-1 text-start">
          <span class="truncate text-label leading-snug text-foreground">{{ props.user.name }}</span>
          <span class="truncate text-caption leading-snug text-muted-foreground"><bdi dir="ltr">{{ props.user.email }}</bdi></span>
        </span>
      </div>
      <NqDropdownMenuSeparator />
      <template v-if="$slots.default">
        <NqDropdownMenuGroup><slot /></NqDropdownMenuGroup>
        <NqDropdownMenuSeparator />
      </template>
      <template v-if="props.preferences">
        <NqDropdownMenuSub>
          <NqDropdownMenuSubTrigger>
            <Palette />
            {{ t.theme }}
          </NqDropdownMenuSubTrigger>
          <NqDropdownMenuSubContent>
            <NqThemeMenuItems />
          </NqDropdownMenuSubContent>
        </NqDropdownMenuSub>
        <NqDropdownMenuSub>
          <NqDropdownMenuSubTrigger>
            <Languages />
            {{ t.language }}
          </NqDropdownMenuSubTrigger>
          <NqDropdownMenuSubContent>
            <NqLocaleMenuItems />
          </NqDropdownMenuSubContent>
        </NqDropdownMenuSub>
        <NqDropdownMenuSeparator v-if="hasSignOut" />
      </template>
      <NqDropdownMenuItem v-if="hasSignOut" @select="emit('signOut')">
        <LogOut />
        {{ t.signOut }}
      </NqDropdownMenuItem>
    </NqDropdownMenuContent>
  </NqDropdownMenu>
</template>
