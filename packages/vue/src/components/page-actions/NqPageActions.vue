<script setup lang="ts">
import { Ellipsis } from "lucide-vue-next";
import { computed, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { buttonVariants } from "../button/variants";
import { useRegisterCommands, type Command } from "../commands";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuGroup, NqDropdownMenuItem, NqDropdownMenuSeparator, NqDropdownMenuTrigger } from "../dropdown-menu";
import { NqKbd } from "../text";
import { NqTooltip } from "../tooltip";
import { shortcutKeys } from "./shortcut-keys";

// The header's action area: at most one visible primary action, the rest behind the more menu, and all of them in
// the command palette ("This page") with their shortcuts bound. Place other always-visible controls as children.
export interface PageAction {
  /** Unique across the command registry. Prefix with your product: "mahaam.issue.archive". */
  id: string;
  label: string;
  /** A lucide-vue-next icon component. */
  icon?: Component;
  onSelect?: () => void;
  /** Navigates instead of running `onSelect`. */
  href?: string;
  /** Bound globally and shown in the menu, tooltip and palette: "C", "Mod Shift D", "G S". */
  shortcut?: string;
  /** Extra palette search words: synonyms, the other language's name. */
  keywords?: string[];
  disabled?: boolean;
  /** Destructive. Red in the menu, and only listed in the palette once the user types. */
  danger?: boolean;
  /** Menu group. A separator is drawn between groups, in first-seen order. */
  group?: string;
}

interface Props {
  /** The one action that stays visible, at the inline end. Label hides below `sm`. */
  primary?: PageAction;
  /** Everything else: behind a "More actions" menu. The menu is omitted when empty. */
  actions?: PageAction[];
  /** Register all actions in the command palette under "This page". Default true. */
  commands?: boolean;
  /** Accessible name of the more trigger. Default "More actions" / "إجراءات أخرى". */
  moreLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { primary: undefined, actions: () => [], commands: true, moreLabel: undefined });
const nq = useNasaq();

function run(action: PageAction | undefined) {
  if (!action || action.disabled) return;
  if (action.href) window.location.assign(action.href);
  else action.onSelect?.();
}

const all = computed(() => (props.primary ? [props.primary, ...props.actions] : props.actions));
useRegisterCommands(() =>
  props.commands
    ? all.value.map<Command>((a) => ({
        id: a.id,
        label: a.label,
        section: "context",
        icon: a.icon,
        shortcut: a.shortcut,
        keywords: a.keywords,
        disabled: a.disabled,
        searchOnly: a.danger,
        priority: a === props.primary ? 1 : 0,
        perform: () => run(a),
      }))
    : null,
);

const groups = computed(() => {
  const map = new Map<string, PageAction[]>();
  for (const a of props.actions) map.set(a.group ?? "", [...(map.get(a.group ?? "") ?? []), a]);
  return [...map.values()];
});
const more = computed(() => props.moreLabel ?? (nq.locale.value.startsWith("ar") ? "إجراءات أخرى" : "More actions"));
const primaryKeys = computed(() => shortcutKeys(props.primary?.shortcut));
defineSlots<{ default?(): unknown }>();
</script>

<template>
  <div data-slot="page-actions" :class="cn('flex items-center gap-1.5', props.class)">
    <slot />
    <NqDropdownMenu v-if="props.actions.length">
      <NqTooltip :content="more">
        <NqDropdownMenuTrigger as-child>
          <NqButton variant="ghost" size="icon-sm" :aria-label="more" class="text-muted-foreground"><Ellipsis aria-hidden="true" /></NqButton>
        </NqDropdownMenuTrigger>
      </NqTooltip>
      <NqDropdownMenuContent align="end" class="min-w-52">
        <template v-for="(items, i) in groups" :key="i">
          <NqDropdownMenuSeparator v-if="i > 0" />
          <NqDropdownMenuGroup>
            <NqDropdownMenuItem v-for="a in items" :key="a.id" :variant="a.danger ? 'danger' : 'default'" :disabled="a.disabled" @select="run(a)">
              <component :is="a.icon" v-if="a.icon" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate">{{ a.label }}</span>
              <span v-if="a.shortcut" dir="ltr" class="ms-auto flex gap-1 [&_kbd]:h-4.5 [&_kbd]:min-w-4.5">
                <NqKbd v-for="(k, ki) in shortcutKeys(a.shortcut)" :key="`${k}${ki}`">{{ k }}</NqKbd>
              </span>
            </NqDropdownMenuItem>
          </NqDropdownMenuGroup>
        </template>
      </NqDropdownMenuContent>
    </NqDropdownMenu>
    <template v-if="props.primary">
      <NqTooltip v-if="props.primary.shortcut">
        <component
          :is="props.primary.href ? 'a' : NqButton"
          :href="props.primary.href"
          :variant="props.primary.href ? undefined : props.primary.danger ? 'danger' : 'primary'"
          :size="props.primary.href ? undefined : 'sm'"
          :disabled="props.primary.href ? undefined : props.primary.disabled"
          :class="props.primary.href ? buttonVariants({ variant: props.primary.danger ? 'danger' : 'primary', size: 'sm' }) : undefined"
          :aria-label="props.primary.icon ? props.primary.label : undefined"
          :aria-keyshortcuts="primaryKeys.join('+')"
          @click="props.primary.href ? undefined : props.primary.onSelect?.()"
        >
          <component :is="props.primary.icon" v-if="props.primary.icon" aria-hidden="true" />
          <span :class="cn(props.primary.icon && 'hidden sm:inline')">{{ props.primary.label }}</span>
        </component>
        <template #content>
          <span class="flex items-center gap-2">
            {{ props.primary.label }}
            <span dir="ltr" class="flex gap-1"><NqKbd v-for="(k, ki) in primaryKeys" :key="`${k}${ki}`">{{ k }}</NqKbd></span>
          </span>
        </template>
      </NqTooltip>
      <component
        :is="props.primary.href ? 'a' : NqButton"
        v-else
        :href="props.primary.href"
        :variant="props.primary.href ? undefined : props.primary.danger ? 'danger' : 'primary'"
        :size="props.primary.href ? undefined : 'sm'"
        :disabled="props.primary.href ? undefined : props.primary.disabled"
        :class="props.primary.href ? buttonVariants({ variant: props.primary.danger ? 'danger' : 'primary', size: 'sm' }) : undefined"
        :aria-label="props.primary.icon ? props.primary.label : undefined"
        @click="props.primary.href ? undefined : props.primary.onSelect?.()"
      >
        <component :is="props.primary.icon" v-if="props.primary.icon" aria-hidden="true" />
        <span :class="cn(props.primary.icon && 'hidden sm:inline')">{{ props.primary.label }}</span>
      </component>
    </template>
  </div>
</template>
