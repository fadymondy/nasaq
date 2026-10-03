<script setup lang="ts">
import { RotateCcw } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import type { ShortcutPlatform } from "../keyboard-shortcuts";
import NqHotkeyRecorder from "./NqHotkeyRecorder.vue";
import { pick, STRINGS, type HotkeyBindingItem, type HotkeyRecorderBinding, type HotkeyRecorderLabels } from "./strings";

// A settings list of shortcuts, one recorder per action, with clash warnings across the whole list and reset to
// defaults. Presentational: it reports each change and you store it.
interface Props {
  bindings: readonly HotkeyBindingItem[];
  /** Called when one binding changes. Reject or resolve `{ error }` to keep the old shortcut. */
  onChange: (id: string, shortcut: string | null) => void | { error?: string } | Promise<void | { error?: string }>;
  sequence?: boolean;
  requireModifier?: boolean;
  platform?: ShortcutPlatform;
  /** Text above the list. Omit to hide it. */
  title?: string | null;
  locale?: string;
  labels?: HotkeyRecorderLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  sequence: undefined,
  requireModifier: true,
  platform: undefined,
  title: undefined,
  locale: undefined,
  labels: undefined,
});

const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const t = computed(() => ({ ...STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const uid = useId();
const failure = ref<string | null>(null);

const others = computed<HotkeyRecorderBinding[]>(() =>
  props.bindings.filter((b) => b.shortcut).map((b) => ({ id: b.id, shortcut: b.shortcut as string, label: pick(b.label, b.labelAr, locale.value) })),
);

const groups = computed(() => {
  const map = new Map<string, { title: string; items: HotkeyBindingItem[] }>();
  for (const b of props.bindings) {
    const key = b.group ?? "";
    const entry = map.get(key) ?? { title: pick(b.group, b.groupAr, locale.value), items: [] };
    entry.items.push(b);
    map.set(key, entry);
  }
  return [...map.entries()];
});

async function change(id: string, shortcut: string | null) {
  failure.value = null;
  try {
    const result = await props.onChange(id, shortcut);
    if (result && typeof result === "object" && result.error) failure.value = result.error;
  } catch {
    failure.value = t.value.invalid;
  }
}
const differing = computed(() => props.bindings.filter((b) => !b.locked && b.defaultShortcut !== undefined && b.defaultShortcut !== b.shortcut));
const heading = computed(() => (props.title === undefined ? null : props.title));
function resetAll() {
  for (const b of differing.value) void change(b.id, b.defaultShortcut ?? null);
}
</script>

<template>
  <div data-slot="hotkey-bindings" :class="cn('flex min-w-0 flex-col gap-5', props.class)">
    <div v-if="heading || differing.length > 0" class="flex flex-wrap items-center justify-between gap-2">
      <h2 v-if="heading" class="text-title text-foreground">{{ heading }}</h2>
      <span v-else />
      <NqButton v-if="differing.length > 0" type="button" variant="ghost" size="sm" @click="resetAll">
        <RotateCcw aria-hidden="true" />
        {{ t.resetAll }}
      </NqButton>
    </div>
    <p v-if="failure" role="alert" class="text-body-sm text-nq-danger-text">{{ failure }}</p>
    <section v-for="[key, group] in groups" :key="key" :aria-labelledby="group.title ? `${uid}-${key}` : undefined" class="flex flex-col">
      <h3 v-if="group.title" :id="`${uid}-${key}`" class="pb-2 text-label text-foreground">{{ group.title }}</h3>
      <ul role="list" class="flex flex-col divide-y divide-border border-y border-border">
        <li
          v-for="b in group.items"
          :key="b.id"
          :data-binding="b.id"
          class="grid grid-cols-1 items-start gap-x-6 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]"
        >
          <div class="flex min-w-0 flex-col">
            <span class="text-body text-foreground">{{ pick(b.label, b.labelAr, locale) }}</span>
            <span v-if="pick(b.description, b.descriptionAr, locale)" class="text-caption text-muted-foreground">{{ pick(b.description, b.descriptionAr, locale) }}</span>
          </div>
          <NqHotkeyRecorder
            :model-value="b.shortcut"
            :sequence="props.sequence"
            :require-modifier="props.requireModifier"
            :bindings="others"
            :binding-id="b.id"
            :reset-to="b.defaultShortcut"
            :platform="props.platform"
            :disabled="b.locked"
            :label="pick(b.label, b.labelAr, locale)"
            :locale="locale"
            :labels="props.labels"
            @update:model-value="(next) => void change(b.id, next)"
          />
        </li>
      </ul>
    </section>
  </div>
</template>
