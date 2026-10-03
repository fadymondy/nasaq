<script setup lang="ts">
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsTab } from "../tabs";
import { defaultAccountSettingsItems, navItem, strings, type AccountSettingsItem } from "./strings";

// The settings page layout: a title, a section nav (a vertical list on wide screens, scrolling tabs on narrow ones)
// and a content area. It only switches which content shows; the sections themselves (a profile form, security
// components, NqDangerZone) are yours, wrapped in NqSettingsSection. Content goes in a named slot per item id
// (<template #security>), or the default slot, which receives `{ id }`. An item's own `content` component wins.
interface Props {
  /** Page title. Default "Account settings" / "إعدادات الحساب". */
  title?: string;
  /** Text under the title. Default a one-line summary. Pass `null` to hide. */
  description?: string | null;
  /** Nav items. Default `defaultAccountSettingsItems(locale)`: Profile, Security, Connected accounts, Notifications, Danger zone. */
  items?: readonly AccountSettingsItem[];
  /** The active item id: `v-model`. */
  modelValue?: string;
  /** The item shown first when uncontrolled. Default: the first item. */
  defaultValue?: string;
  /** Accessible name of the section nav. Default "Settings sections" / "أقسام الإعدادات". */
  navLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  description: undefined,
  items: undefined,
  modelValue: undefined,
  defaultValue: undefined,
  navLabel: undefined,
});
const emit = defineEmits<{ "update:modelValue": [id: string] }>();

const nq = useNasaq();
const t = computed(() => strings(nq.locale.value));
const list = computed(() => props.items ?? defaultAccountSettingsItems(nq.locale.value));
const inner = ref(props.defaultValue ?? list.value[0]?.id ?? "");
const activeId = computed(() => props.modelValue ?? inner.value);
const active = computed(() => list.value.find((item) => item.id === activeId.value) ?? list.value[0]);
const contentId = `nq-account-settings-${useId()}`;

function select(id: string) {
  if (props.modelValue === undefined) inner.value = id;
  emit("update:modelValue", id);
}

const dangerTab = "text-nq-danger-text data-active:text-nq-danger-text";
const dangerNav = "text-nq-danger-text hover:text-nq-danger-text data-[active=true]:text-nq-danger-text";
</script>

<template>
  <div data-slot="account-settings" :class="cn('mx-auto flex w-full max-w-5xl flex-col gap-6', props.class)">
    <header data-slot="account-settings-header" class="flex flex-col gap-1">
      <h1 class="text-h1 text-foreground">{{ props.title ?? t.title }}</h1>
      <p v-if="props.description !== null" class="text-body text-muted-foreground">{{ props.description ?? t.description }}</p>
    </header>
    <div class="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[15rem_minmax(0,1fr)] md:items-start md:gap-10">
      <div data-slot="account-settings-nav" class="min-w-0 overflow-x-auto md:overflow-visible">
        <NqTabs :model-value="active?.id" class="gap-0 md:hidden" @update:model-value="select(String($event))">
          <NqTabsList variant="underline" :aria-label="props.navLabel ?? t.nav" class="gap-5">
            <NqTabsTab v-for="item in list" :key="item.id" :value="item.id" :aria-controls="contentId" :class="cn(item.tone === 'danger' && dangerTab)">
              <component :is="item.icon" v-if="item.icon" aria-hidden="true" />
              {{ item.label }}
            </NqTabsTab>
            <NqTabsIndicator />
          </NqTabsList>
        </NqTabs>
        <nav :aria-label="props.navLabel ?? t.nav" class="sticky top-4 hidden md:block">
          <ul class="flex flex-col gap-0.5">
            <li v-for="item in list" :key="item.id">
              <button
                type="button"
                :data-active="item.id === active?.id"
                :data-tone="item.tone"
                :aria-current="item.id === active?.id ? 'page' : undefined"
                :aria-controls="contentId"
                :title="item.description"
                :class="cn(navItem, item.tone === 'danger' && dangerNav)"
                @click="select(item.id)"
              >
                <component :is="item.icon" v-if="item.icon" aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
                <span v-if="item.badge" class="shrink-0 text-caption tabular-nums">{{ item.badge }}</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div :id="contentId" role="region" :aria-label="active?.label" data-slot="account-settings-content" :data-section="active?.id" class="flex min-w-0 flex-col gap-6">
        <component :is="active.content" v-if="active?.content" />
        <slot v-else-if="active && $slots[active.id]" :name="active.id" />
        <slot v-else :id="active?.id ?? ''" />
      </div>
    </div>
  </div>
</template>
