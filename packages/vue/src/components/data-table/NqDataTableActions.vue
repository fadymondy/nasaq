<script setup lang="ts">
import { Ellipsis } from "lucide-vue-next";
import { computed, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuGroup, NqDropdownMenuItem, NqDropdownMenuTrigger } from "../dropdown-menu";
import { dataTableStrings } from "./strings";

// Table-level actions for the toolbar: one primary button, secondary buttons, and a ⋯ menu. Below the `sm` breakpoint
// the secondary buttons fold into the menu so the toolbar never overflows.
export interface DataTableAction {
  id: string;
  label: string;
  icon?: Component;
  onSelect: () => void;
  /** The one prominent button. Only the first action with `primary` is used. */
  primary?: boolean;
  /** Always in the ⋯ menu, never a button. */
  overflow?: boolean;
  /** A button with just the icon (refresh). The label stays as its name. Ignored without an `icon`. */
  iconOnly?: boolean;
  disabled?: boolean;
  /** Spinner on the button and blocked while true. */
  loading?: boolean;
  danger?: boolean;
}
interface Props {
  actions: DataTableAction[];
  /** Name of the ⋯ button. Localised by default. */
  moreLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const slots = defineSlots<{ default?: () => unknown }>();
const nq = useNasaq();
const t = computed(() => dataTableStrings(nq.locale.value));
const primary = computed(() => props.actions.find((a) => a.primary));
const buttons = computed(() => props.actions.filter((a) => a !== primary.value && !a.overflow));
const menu = computed(() => props.actions.filter((a) => a !== primary.value && a.overflow));
const empty = computed(() => !primary.value && !buttons.value.length && !menu.value.length && !slots.default);
const menuItems = computed(() => [...buttons.value.map((a) => ({ a, cls: "sm:hidden" })), ...menu.value.map((a) => ({ a, cls: undefined }))]);
const isIconOnly = (a: DataTableAction) => !!a.iconOnly && !!a.icon;
</script>

<template>
  <div v-if="!empty" data-slot="data-table-actions" :class="cn('flex items-center gap-2', props.class)">
    <NqButton
      v-for="a in buttons"
      :key="a.id"
      :size="isIconOnly(a) ? 'icon-sm' : 'sm'"
      :variant="a.danger ? 'danger' : 'secondary'"
      :disabled="a.disabled"
      :loading="a.loading"
      :aria-label="isIconOnly(a) ? a.label : undefined"
      :title="isIconOnly(a) ? a.label : undefined"
      :data-action="a.id"
      class="max-sm:hidden"
      @click="a.onSelect()"
    >
      <component :is="a.icon" v-if="a.icon" aria-hidden="true" />
      <template v-if="!isIconOnly(a)">{{ a.label }}</template>
    </NqButton>
    <slot />
    <NqDropdownMenu v-if="menu.length || buttons.length">
      <NqDropdownMenuTrigger as-child>
        <NqButton variant="secondary" size="icon-sm" :aria-label="props.moreLabel ?? t.moreActions" data-slot="data-table-actions-more" :class="cn(!menu.length && 'sm:hidden')">
          <Ellipsis aria-hidden="true" />
        </NqButton>
      </NqDropdownMenuTrigger>
      <NqDropdownMenuContent align="end" class="min-w-44">
        <NqDropdownMenuGroup>
          <NqDropdownMenuItem v-for="{ a, cls } in menuItems" :key="a.id" :variant="a.danger ? 'danger' : 'default'" :disabled="a.disabled || a.loading" :class="cls" @select="a.onSelect()">
            <component :is="a.icon" v-if="a.icon" aria-hidden="true" />
            {{ a.label }}
          </NqDropdownMenuItem>
        </NqDropdownMenuGroup>
      </NqDropdownMenuContent>
    </NqDropdownMenu>
    <NqButton
      v-if="primary"
      :size="isIconOnly(primary) ? 'icon-sm' : 'sm'"
      :variant="primary.danger ? 'danger' : 'primary'"
      :disabled="primary.disabled"
      :loading="primary.loading"
      :aria-label="isIconOnly(primary) ? primary.label : undefined"
      :title="isIconOnly(primary) ? primary.label : undefined"
      :data-action="primary.id"
      @click="primary.onSelect()"
    >
      <component :is="primary.icon" v-if="primary.icon" aria-hidden="true" />
      <template v-if="!isIconOnly(primary)">{{ primary.label }}</template>
    </NqButton>
  </div>
</template>
