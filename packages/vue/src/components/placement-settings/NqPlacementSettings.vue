<script setup lang="ts">
import { Save, Undo2 } from "lucide-vue-next";
import { computed, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqInput } from "../field";
import { NqRadioCard, NqRadioGroup } from "../radio-group";
import { NqSwitch } from "../switch";
import { PLACEMENT_STRINGS, type PlacementSettingsLabels } from "./labels";
import NqPlacementDiagram from "./NqPlacementDiagram.vue";
import { canBeDefaultPage, isModeAvailable, PLACEMENT_MODES, parseOrder, placementChanges, withMode, type PlacementMode, type PlacementValue } from "./placement-logic";

// Where a plugin or module appears in the app shell: sidebar, header, a side panel, a floating widget or nowhere, its order,
// and whether the app opens on it. Holds a draft, shows what is unsaved, and saves only what changed.
type Labels = Partial<Omit<PlacementSettingsLabels, "modes" | "modeHints">> & {
  modes?: Partial<PlacementSettingsLabels["modes"]>;
  modeHints?: Partial<PlacementSettingsLabels["modeHints"]>;
};
interface Props {
  /** The saved placement. The form starts from it and starts over whenever it changes (after a save). */
  value: PlacementValue;
  /** Called with only the fields that changed. Return a promise to show saving until it settles. */
  onSave?: (changes: Partial<PlacementValue>) => void | Promise<unknown>;
  /** Saving from outside, e.g. a mutation's pending state. */
  saving?: boolean;
  /** `true` or a message: the last save failed. */
  error?: boolean | string;
  /** Allow the side panel and floating widget modes. Default `false`. */
  allowOverlays?: boolean;
  /** Show the "Open on start" switch. Default `false`. */
  allowDefaultPage?: boolean;
  /** Which modes to offer, in order. Default all five. */
  modes?: readonly PlacementMode[];
  /** Replaces the heading; `null` for none (e.g. inside a tab that already has one). */
  title?: string | null;
  description?: string | null;
  headingAs?: string;
  labels?: Labels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  onSave: undefined,
  saving: false,
  error: undefined,
  allowOverlays: false,
  allowDefaultPage: false,
  modes: () => PLACEMENT_MODES,
  title: undefined,
  description: undefined,
  headingAs: "h2",
  labels: undefined,
});

const nq = useNasaq();
const t = computed(() => {
  const base = PLACEMENT_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"];
  return { ...base, ...props.labels, modes: { ...base.modes, ...props.labels?.modes }, modeHints: { ...base.modeHints, ...props.labels?.modeHints } };
});
const id = useId();

const draft = ref<PlacementValue>({ ...props.value });
const orderText = ref(String(props.value.order));
const pending = ref(false);
// Start over from the saved value whenever it changes.
const key = computed(() => `${props.value.mode}|${props.value.order}|${Boolean(props.value.defaultPage)}`);
watch(key, () => {
  draft.value = { ...props.value };
  orderText.value = String(props.value.order);
});

const orderValid = computed(() => parseOrder(orderText.value) !== null);
const changes = computed(() => placementChanges(props.value, draft.value, props.allowDefaultPage));
const hasChanges = computed(() => Object.keys(changes.value).length > 0);
const dirty = computed(() => hasChanges.value || !orderValid.value);
const busy = computed(() => props.saving || pending.value);
const startAllowed = computed(() => canBeDefaultPage(draft.value.mode));
const heading = computed(() => (props.title === undefined ? t.value.title : props.title));
const sub = computed(() => (props.description === undefined ? t.value.description : props.description));

function pick(next: unknown) {
  draft.value = withMode(draft.value, next as PlacementMode);
}
function onOrder(raw: string | number | undefined) {
  const text = String(raw ?? "");
  orderText.value = text;
  const n = parseOrder(text);
  if (n !== null) draft.value = { ...draft.value, order: n };
}
function save() {
  if (!orderValid.value || !hasChanges.value) return;
  const result = props.onSave?.(changes.value);
  if (result && typeof (result as Promise<unknown>).finally === "function") {
    pending.value = true;
    (result as Promise<unknown>).catch(() => {}).finally(() => (pending.value = false));
  }
}
function reset() {
  draft.value = { ...props.value };
  orderText.value = String(props.value.order);
}
</script>

<template>
  <section
    data-slot="placement-settings"
    :data-dirty="dirty ? 'true' : undefined"
    :aria-labelledby="heading ? `${id}-title` : undefined"
    :class="cn('flex flex-col rounded-card border border-border bg-card', props.class)"
  >
    <header v-if="heading || sub || $slots.title || $slots.description" class="flex flex-col gap-1 border-b border-border px-5 py-4">
      <component :is="props.headingAs" v-if="heading || $slots.title" :id="`${id}-title`" class="text-h4 text-foreground">
        <slot name="title">{{ heading }}</slot>
      </component>
      <p v-if="sub || $slots.description" class="text-body-sm text-muted-foreground"><slot name="description">{{ sub }}</slot></p>
    </header>

    <div class="flex flex-col gap-6 px-5 py-5">
      <fieldset class="flex flex-col gap-2">
        <legend :id="`${id}-placement`" class="pb-2 text-label text-foreground">{{ t.placement }}</legend>
        <NqRadioGroup :aria-labelledby="`${id}-placement`" :model-value="draft.mode" :disabled="busy" class="grid gap-2 sm:grid-cols-2" @update:model-value="pick">
          <NqRadioCard
            v-for="mode in props.modes"
            :key="mode"
            :value="mode"
            :data-mode="mode"
            :disabled="!isModeAvailable(mode, props.allowOverlays)"
            :title="t.modes[mode]"
            :description="isModeAvailable(mode, props.allowOverlays) ? t.modeHints[mode] : `${t.modeHints[mode]} ${t.overlayOnly}`"
            class="p-3"
          >
            <template #meta><NqPlacementDiagram :mode="mode" /></template>
          </NqRadioCard>
        </NqRadioGroup>
      </fieldset>

      <div class="grid gap-6 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label :for="`${id}-order`" class="text-label text-foreground">{{ t.order }}</label>
          <NqInput
            :id="`${id}-order`"
            ltr
            type="number"
            inputmode="numeric"
            min="0"
            step="1"
            :model-value="orderText"
            :disabled="busy"
            :aria-invalid="!orderValid || undefined"
            :aria-describedby="`${id}-order-hint`"
            class="w-32"
            @update:model-value="onOrder"
          />
          <p :id="`${id}-order-hint`" :class="cn('text-caption', orderValid ? 'text-muted-foreground' : 'text-nq-danger-text')">
            {{ orderValid ? t.orderHint : t.orderInvalid }}
          </p>
        </div>

        <div v-if="props.allowDefaultPage" data-slot="placement-default-page" class="flex items-start gap-3">
          <NqSwitch
            :id="`${id}-start`"
            :model-value="Boolean(draft.defaultPage) && startAllowed"
            :disabled="!startAllowed || busy"
            :aria-describedby="`${id}-start-hint`"
            class="mt-0.5"
            @update:model-value="(checked: boolean) => (draft = { ...draft, defaultPage: checked })"
          />
          <div class="flex flex-col gap-0.5">
            <label :for="`${id}-start`" :class="cn('text-label text-foreground', !startAllowed && 'opacity-50')">{{ t.defaultPage }}</label>
            <p :id="`${id}-start-hint`" class="text-caption text-muted-foreground">{{ startAllowed ? t.defaultPageHint : t.defaultPageBlocked }}</p>
          </div>
        </div>
      </div>

      <NqAlert v-if="props.error || $slots.error" tone="danger" :title="t.saveFailed">
        <slot name="error"><template v-if="props.error !== true">{{ props.error }}</template></slot>
      </NqAlert>
    </div>

    <footer class="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3">
      <span role="status" data-slot="placement-state" class="text-caption text-muted-foreground">
        <span v-if="dirty" class="inline-flex items-center gap-1.5">
          <span aria-hidden="true" class="size-1.5 rounded-full bg-[var(--nq-tag-amber)]" />
          {{ t.unsaved }}
        </span>
        <template v-else>{{ t.saved }}</template>
      </span>
      <div class="ms-auto flex gap-2">
        <NqButton size="sm" variant="ghost" :disabled="!dirty || busy" @click="reset">
          <Undo2 aria-hidden="true" />
          {{ t.reset }}
        </NqButton>
        <NqButton size="sm" :loading="busy" :disabled="!dirty || !orderValid" @click="save">
          <Save aria-hidden="true" />
          {{ t.save }}
        </NqButton>
      </div>
    </footer>
  </section>
</template>
