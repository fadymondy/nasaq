<script setup lang="ts">
import { Check, Globe, Hash, NotebookPen, Zap } from "lucide-vue-next";
import { computed, onMounted, ref, useId } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { isApplePlatform } from "../commands/commands";
import { NqDialogDescription, NqDialogTitle } from "../dialog";
import { NqTextarea } from "../field";
import { NqIcon } from "../icon";
import { NqKbd } from "../text";
import { buildCapture, canSaveCapture, extractCaptureTags, isCaptureSaveKey, type CaptureValue } from "./quick-capture-logic";
import { fill, type QuickCaptureStrings } from "./strings";
import type { QuickCaptureDestination, QuickCapturePage } from "./types";

// The capture form shared by both presentations: the dialog body or the bare panel.
interface Props {
  t: QuickCaptureStrings;
  dialog: boolean;
  onCapture: (capture: CaptureValue) => unknown;
  page?: QuickCapturePage;
  destinations?: QuickCaptureDestination[];
  defaultDestinationId?: string;
  suggestedTags?: string[];
  initialText?: string;
  placeholder?: string;
  hintKeys?: string[];
  showHints?: boolean;
}
const props = withDefaults(defineProps<Props>(), { initialText: "", hintKeys: () => [], showHints: true });
const emit = defineEmits<{ done: []; close: [] }>();

const text = ref(props.initialText);
const picked = ref<string[]>([]);
const destination = ref(props.defaultDestinationId ?? props.destinations?.[0]?.id);
const pending = ref(false);
const error = ref<string>();
const saved = ref<string>();
const area = ref<{ $el: HTMLTextAreaElement } | null>(null);
const errorId = useId();
let busy = false;

const clip = computed(() => Boolean(props.page));
const typedTags = computed(() => extractCaptureTags(text.value));
const canSave = computed(() => canSaveCapture(text.value, props.page));
const destLabel = computed(() => props.destinations?.find((d) => d.id === destination.value)?.label);
const modKey = isApplePlatform() ? "⌘" : "Ctrl";
const focusArea = () => area.value?.$el?.focus();
onMounted(focusArea);

async function save() {
  if (busy) return;
  if (!canSave.value) {
    error.value = props.t.empty;
    focusArea();
    return;
  }
  busy = true;
  pending.value = true;
  error.value = undefined;
  try {
    const outcome = (await props.onCapture(buildCapture({ text: text.value, tags: picked.value, page: props.page, destinationId: destination.value }))) as
      | { error?: string }
      | void
      | undefined;
    if (outcome && typeof outcome === "object" && outcome.error) {
      error.value = outcome.error;
      return;
    }
    if (props.dialog) {
      emit("done");
    } else {
      text.value = "";
      picked.value = [];
      saved.value = destLabel.value ? fill(props.t.saved, { destination: destLabel.value }) : props.t.savedPlain;
      focusArea();
    }
  } catch {
    error.value = props.t.failed;
  } finally {
    busy = false;
    pending.value = false;
  }
}

function onKeydown(e: KeyboardEvent) {
  if (isCaptureSaveKey(e)) {
    e.preventDefault();
    void save();
  } else if (e.key === "Escape" && !props.dialog && !e.isComposing) {
    e.preventDefault();
    emit("close");
  }
}

function onInput() {
  if (error.value) error.value = undefined;
  if (saved.value) saved.value = undefined;
}

const toggleTag = (tag: string) => (picked.value = picked.value.includes(tag) ? picked.value.filter((x) => x !== tag) : [...picked.value, tag]);

const pill = "outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus";
const on = "border-transparent bg-nq-selected text-foreground";
const off = "border-border text-muted-foreground hover:bg-nq-hover hover:text-foreground";
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4" @keydown="onKeydown">
    <div class="flex flex-col gap-1">
      <component :is="dialog ? NqDialogTitle : 'p'" class="flex items-center gap-2 text-h4 font-semibold">
        <NqIcon :icon="clip ? Globe : Zap" class="size-4 text-muted-foreground" />
        {{ clip ? t.clipTitle : t.title }}
      </component>
      <component :is="dialog ? NqDialogDescription : 'p'" class="text-body-sm text-muted-foreground">{{ clip ? t.clipDescription : t.description }}</component>
    </div>

    <div v-if="page" data-slot="quick-capture-page" class="flex min-w-0 flex-col gap-1 rounded-card border border-border bg-nq-surface-2 p-3">
      <span class="eyebrow">{{ t.page }}</span>
      <span v-if="page.title" dir="auto" class="truncate text-body font-medium">{{ page.title }}</span>
      <bdi dir="ltr" class="truncate text-caption text-muted-foreground">{{ page.url }}</bdi>
      <blockquote v-if="page.selection" dir="auto" class="mt-1 line-clamp-3 border-s-2 border-border ps-3 text-body-sm text-muted-foreground">{{ page.selection }}</blockquote>
    </div>

    <div class="flex flex-col gap-1.5">
      <NqTextarea
        ref="area"
        v-model="text"
        autofocus
        :rows="clip ? 3 : 5"
        dir="auto"
        :readonly="pending"
        :placeholder="placeholder ?? (clip ? t.clipPlaceholder : t.placeholder)"
        :aria-label="clip ? t.clipPlaceholder : t.title"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="error ? errorId : undefined"
        class="min-h-0 resize-none"
        @input="onInput"
      />
      <p v-if="error" :id="errorId" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>
    </div>

    <div v-if="typedTags.length || suggestedTags?.length" class="flex flex-wrap items-center gap-1.5" role="group" :aria-label="t.tags">
      <NqIcon :icon="Hash" class="size-3.5 text-muted-foreground" />
      <NqBadge v-for="tag in typedTags" :key="`typed-${tag}`" variant="tag"><bdi>#{{ tag }}</bdi></NqBadge>
      <button
        v-for="tag in suggestedTags?.filter((x) => !typedTags.includes(x.toLowerCase()))"
        :key="tag"
        type="button"
        :aria-pressed="picked.includes(tag)"
        :class="cn('inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-caption', pill, picked.includes(tag) ? on : off)"
        @click="toggleTag(tag)"
      >
        <NqIcon v-if="picked.includes(tag)" :icon="Check" class="size-3" />
        <bdi>#{{ tag }}</bdi>
      </button>
    </div>

    <div v-if="destinations && destinations.length > 1" class="flex flex-wrap items-center gap-2" role="radiogroup" :aria-label="t.destination">
      <span class="text-caption text-muted-foreground">{{ t.destination }}</span>
      <button
        v-for="d in destinations"
        :key="d.id"
        type="button"
        role="radio"
        :aria-checked="d.id === destination"
        :class="cn('inline-flex h-control-sm items-center gap-1.5 rounded-control border px-2.5 text-body-sm', pill, d.id === destination ? on : off)"
        @click="destination = d.id"
      >
        <component :is="d.icon" v-if="d.icon" />
        <NqIcon v-else :icon="NotebookPen" class="size-3.5" />
        {{ d.label }}
      </button>
    </div>

    <p role="status" :class="cn('text-caption text-nq-success-text', !saved && 'sr-only')">{{ saved ?? "" }}</p>

    <div :class="cn('flex flex-wrap items-center gap-2', dialog ? '' : 'justify-between')">
      <p v-if="showHints" class="me-auto flex flex-wrap items-center gap-x-1.5 text-caption text-muted-foreground" dir="ltr">
        <span class="inline-flex items-center gap-0.5">
          <NqKbd>{{ modKey }}</NqKbd>
          <NqKbd>Enter</NqKbd>
        </span>
        <span>{{ t.saveHint }}</span>
        <span aria-hidden="true">·</span>
        <NqKbd>Esc</NqKbd>
        <span>{{ t.closeHint }}</span>
        <template v-if="hintKeys.length">
          <span aria-hidden="true">·</span>
          <span class="inline-flex items-center gap-0.5" :title="t.shortcutHint">
            <NqKbd v-for="k in hintKeys" :key="k">{{ k }}</NqKbd>
          </span>
        </template>
      </p>
      <div :class="cn('flex gap-2', dialog ? '' : 'ms-auto')">
        <NqButton type="button" variant="ghost" :disabled="pending" @click="emit('close')">{{ t.cancel }}</NqButton>
        <NqButton type="button" variant="primary" :loading="pending" :disabled="!canSave" @click="save">{{ pending ? t.saving : t.save }}</NqButton>
      </div>
    </div>
  </div>
</template>
