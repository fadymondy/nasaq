<script setup lang="ts">
import { Check, ChevronsUpDown, Plus } from "lucide-vue-next";
import { computed, getCurrentInstance, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { useSidebarCollapsed } from "../app-shell";
import {
  NqDropdownMenu,
  NqDropdownMenuContent,
  NqDropdownMenuGroup,
  NqDropdownMenuItem,
  NqDropdownMenuLabel,
  NqDropdownMenuSeparator,
  NqDropdownMenuTrigger,
} from "../dropdown-menu";
import NqWorkspaceLogo, { type Workspace } from "./NqWorkspaceLogo.vue";

// The organisation / team switcher at the top of the sidebar (shadcn TeamSwitcher, Linear).
// v-model is the active workspace id. Listen to `@create` to add the "Add workspace" item; the default slot adds items under the list.
interface Props {
  workspaces: Workspace[];
  modelValue: string;
  labels?: { heading?: string; create?: string };
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { labels: undefined });
const emit = defineEmits<{ "update:modelValue": [id: string]; create: [] }>();
const hasCreate = typeof (getCurrentInstance()?.vnode.props ?? {}).onCreate !== "undefined";

const railState = useSidebarCollapsed();
const rail = computed(() => Boolean(railState.value)); // tolerate the plain-object fallback outside an app shell
const nq = useNasaq();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const active = computed(() => props.workspaces.find((w) => w.id === props.modelValue) ?? props.workspaces[0]);
</script>

<template>
  <NqDropdownMenu v-if="active">
    <NqDropdownMenuTrigger
      data-slot="workspace-switcher"
      :aria-label="rail ? active.name : undefined"
      :class="
        cn(
          'flex w-full items-center gap-2 rounded-control px-1.5 text-start outline-none',
          'transition-colors duration-150 ease-nq hover:bg-nq-hover data-popup-open:bg-nq-selected',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
          rail ? 'size-control justify-center px-0' : 'min-h-[calc(var(--spacing-nav-row)+12px)] border border-border bg-background/60 py-1 shadow-xs hover:border-nq-line-strong',
          props.class,
        )
      "
    >
      <NqWorkspaceLogo :workspace="active" :size="rail ? 'sm' : 'md'" />
      <template v-if="!rail">
        <span class="grid min-w-0 flex-1">
          <span class="truncate text-label leading-snug text-foreground">{{ active.name }}</span>
          <span v-if="active.description" class="truncate text-caption leading-snug text-muted-foreground">{{ active.description }}</span>
        </span>
        <ChevronsUpDown aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
      </template>
    </NqDropdownMenuTrigger>
    <NqDropdownMenuContent
      :side="rail ? 'inline-end' : 'bottom'"
      align="start"
      :style="{ '--anchor-width': 'var(--reka-dropdown-menu-trigger-width)' }"
      :class="cn('w-64', !rail && 'w-[max(16rem,var(--anchor-width))]')"
    >
      <NqDropdownMenuGroup>
        <NqDropdownMenuLabel>{{ props.labels?.heading ?? (ar ? "مساحات العمل" : "Workspaces") }}</NqDropdownMenuLabel>
        <NqDropdownMenuItem
          v-for="workspace in props.workspaces"
          :key="workspace.id"
          :aria-current="workspace.id === active.id ? 'true' : undefined"
          class="h-10 aria-[current]:font-medium"
          @select="emit('update:modelValue', workspace.id)"
        >
          <NqWorkspaceLogo :workspace="workspace" size="sm" />
          <span class="min-w-0 flex-1 truncate">{{ workspace.name }}</span>
          <Check v-if="workspace.id === active.id" aria-hidden="true" class="text-foreground!" />
        </NqDropdownMenuItem>
      </NqDropdownMenuGroup>
      <NqDropdownMenuSeparator v-if="$slots.default || hasCreate" />
      <slot />
      <NqDropdownMenuItem v-if="hasCreate" class="text-muted-foreground" @select="emit('create')">
        <span class="inline-flex size-6 items-center justify-center rounded-control border border-dashed border-border">
          <Plus class="size-3.5!" />
        </span>
        {{ props.labels?.create ?? (ar ? "إضافة مساحة عمل" : "Add workspace") }}
      </NqDropdownMenuItem>
    </NqDropdownMenuContent>
  </NqDropdownMenu>
</template>
