<script setup lang="ts">
import { Keyboard, Search } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqInput } from "../field";
import { NqEmptyState } from "../states";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { hotkeyTextMatches } from "./hotkey-logic";
import { pick, shortcutItemKeys, STRINGS, useShortcutApple, type KeyboardShortcutsLabels, type ShortcutGroup, type ShortcutPlatform } from "./keyboard-shortcuts";
import NqShortcutKeys from "./NqShortcutKeys.vue";

// A reference of the keyboard shortcuts of an app: grouped, searchable in Arabic and English, drawn for the reader's
// keyboard (⌘ on a Mac, Ctrl elsewhere) with a switch to see the other one. Presentational: pass the groups.
interface Props {
  groups: readonly ShortcutGroup[];
  /** Which keyboard to draw (`v-model:platform`). Default "auto": this device. */
  platform?: ShortcutPlatform;
  /** Let people switch between Mac and Windows keys. Default true. */
  showPlatformSwitch?: boolean;
  /** Search box. Default true. */
  searchable?: boolean;
  /** Heading above the list. Pass `null` to hide it. */
  title?: string | null;
  description?: string;
  locale?: string;
  /** Override any built-in string. */
  labels?: KeyboardShortcutsLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  platform: undefined,
  showPlatformSwitch: true,
  searchable: true,
  title: undefined,
  description: undefined,
  locale: undefined,
  labels: undefined,
});
const emit = defineEmits<{ "update:platform": [platform: ShortcutPlatform] }>();
const slots = defineSlots<{ title?(): unknown; description?(): unknown }>();

const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const t = computed(() => ({ ...STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const uid = useId();
const ownPlatform = ref<ShortcutPlatform>("auto");
const platform = computed(() => props.platform ?? ownPlatform.value);
const apple = useShortcutApple(platform);
const query = ref("");

function onPlatform(v: string[]) {
  const next = v[0] as ShortcutPlatform | undefined;
  if (!next) return;
  if (props.platform === undefined) ownPlatform.value = next;
  emit("update:platform", next);
}

const visible = computed(() =>
  props.groups
    .map((g) => {
      const groupTitle = pick(g.title, g.titleAr, locale.value);
      const groupHit = query.value !== "" && hotkeyTextMatches(groupTitle, query.value);
      const items = g.items.filter(
        (item) =>
          groupHit ||
          hotkeyTextMatches(
            `${pick(item.label, item.labelAr, locale.value)} ${pick(item.description, item.descriptionAr, locale.value)} ${shortcutItemKeys(item, apple.value).join(" ")}`,
            query.value,
          ),
      );
      return { group: g, title: groupTitle, items };
    })
    .filter((g) => g.items.length > 0),
);
const total = computed(() => visible.value.reduce((sum, g) => sum + g.items.length, 0));
const count = computed(() => new Intl.NumberFormat(locale.value, { numberingSystem: "latn" }).format(total.value));
const heading = computed(() => (props.title === undefined ? t.value.title : props.title));
const hasHeading = computed(() => Boolean(slots.title || heading.value));
const hasDescription = computed(() => Boolean(slots.description || props.description));
</script>

<template>
  <section data-slot="shortcuts-reference" :aria-labelledby="hasHeading ? `${uid}-title` : undefined" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <header v-if="hasHeading || hasDescription" class="flex flex-col gap-1">
      <h2 v-if="hasHeading" :id="`${uid}-title`" class="text-title text-foreground"><slot name="title">{{ heading }}</slot></h2>
      <p v-if="hasDescription" class="text-body-sm text-muted-foreground"><slot name="description">{{ props.description }}</slot></p>
    </header>

    <div v-if="props.searchable || props.showPlatformSwitch" class="flex flex-wrap items-center gap-3">
      <div v-if="props.searchable" class="relative min-w-48 flex-1">
        <Search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
        <NqInput v-model="query" type="search" :placeholder="t.search" :aria-label="t.search" class="ps-9" />
      </div>
      <NqToggleGroup v-if="props.showPlatformSwitch" :aria-label="t.platform" :model-value="[platform]" @update:model-value="onPlatform">
        <NqToggle value="auto">{{ t.auto }}</NqToggle>
        <NqToggle value="mac">{{ t.mac }}</NqToggle>
        <NqToggle value="windows">{{ t.windows }}</NqToggle>
      </NqToggleGroup>
    </div>

    <span role="status" aria-live="polite" class="sr-only">{{ total === 1 ? t.resultsOne : t.results(count) }}</span>

    <NqEmptyState v-if="visible.length === 0" :icon="Keyboard" :title="t.empty" :description="t.emptyHint" />
    <div v-else class="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
      <div v-for="{ group, title: groupTitle, items } in visible" :key="group.id" :data-group="group.id" role="group" :aria-labelledby="`${uid}-${group.id}`" class="flex min-w-0 flex-col">
        <h3 :id="`${uid}-${group.id}`" class="pb-2 text-label text-foreground">{{ groupTitle }}</h3>
        <ul role="list" class="flex flex-col divide-y divide-border border-y border-border">
          <li v-for="item in items" :key="item.id" :data-item="item.id" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5">
            <div class="flex min-w-0 flex-1 basis-40 flex-col">
              <span class="text-body text-foreground">{{ pick(item.label, item.labelAr, locale) }}</span>
              <span v-if="pick(item.description, item.descriptionAr, locale)" class="text-caption text-muted-foreground">{{ pick(item.description, item.descriptionAr, locale) }}</span>
            </div>
            <div class="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1">
              <template v-for="(s, i) in shortcutItemKeys(item, apple)" :key="s">
                <span v-if="i > 0" class="text-caption text-muted-foreground">{{ t.or }}</span>
                <NqShortcutKeys :shortcut="s" :platform="platform" :then-label="t.then" />
              </template>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
