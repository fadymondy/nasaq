<script setup lang="ts">
import { computed, useId } from "vue";
import { useNasaq } from "../../provider";
import { NqField, NqFieldLabel, NqTextarea } from "../field";
import { formatNumber } from "../numeric";
import { NqRepeater } from "../repeater";
import { NqRichTextEditor, type RichTextTiptap } from "../rich-text-editor";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import NqLandingTextField from "./NqLandingTextField.vue";
import { isSafeHref, newId, type LandingFaqItem, type LandingItem, type LandingSection, type LandingSectionType, type SectionDataMap } from "./landing-page";
import type { LandingPageEditorLabels } from "./strings";

// The form for one section. Internal to the landing page editor.
interface Props {
  section: LandingSection;
  t: LandingPageEditorLabels;
  load?: () => Promise<RichTextTiptap>;
}
const props = withDefaults(defineProps<Props>(), { load: undefined });
const emit = defineEmits<{ patch: [patch: Partial<SectionDataMap[LandingSectionType]>] }>();
const nq = useNasaq();
const id = useId();
const num = (n: number) => formatNumber(n, nq.locale.value);
const linkError = (v: string | undefined) => (v && !isSafeHref(v) ? props.t.linkInvalid : undefined);
const alignItems = computed(() => [
  { value: "start", label: props.t.alignStart },
  { value: "center", label: props.t.alignCenter },
]);
const patch = (p: Record<string, unknown>) => emit("patch", p as Partial<SectionDataMap[LandingSectionType]>);
const hero = computed(() => (props.section.type === "hero" ? props.section.data : null));
const features = computed(() => (props.section.type === "features" ? props.section.data : null));
const faq = computed(() => (props.section.type === "faq" ? props.section.data : null));
const cta = computed(() => (props.section.type === "cta" ? props.section.data : null));
const text = computed(() => (props.section.type === "text" ? props.section.data : null));
</script>

<template>
  <div v-if="hero" class="flex flex-col gap-4">
    <NqLandingTextField :label="t.eyebrow" :model-value="hero.eyebrow ?? ''" @update:model-value="(v) => patch({ eyebrow: v })" />
    <NqLandingTextField :label="t.headline" :model-value="hero.headline" multiline @update:model-value="(v) => patch({ headline: v })" />
    <NqLandingTextField :label="t.subheadline" :model-value="hero.subheadline" multiline @update:model-value="(v) => patch({ subheadline: v })" />
    <NqLandingTextField :label="t.primaryLabel" :model-value="hero.primaryLabel" @update:model-value="(v) => patch({ primaryLabel: v })" />
    <NqLandingTextField :label="t.primaryHref" :model-value="hero.primaryHref" ltr :error="linkError(hero.primaryHref)" @update:model-value="(v) => patch({ primaryHref: v })" />
    <NqLandingTextField :label="t.secondaryLabel" :model-value="hero.secondaryLabel ?? ''" @update:model-value="(v) => patch({ secondaryLabel: v })" />
    <NqLandingTextField :label="t.secondaryHref" :model-value="hero.secondaryHref ?? ''" ltr :error="linkError(hero.secondaryHref)" @update:model-value="(v) => patch({ secondaryHref: v })" />
    <NqField>
      <NqFieldLabel>{{ t.align }}</NqFieldLabel>
      <NqSelect :model-value="hero.align" @update:model-value="(v: string | number | null) => v && patch({ align: v })">
        <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
        <NqSelectContent>
          <NqSelectItem v-for="o in alignItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
        </NqSelectContent>
      </NqSelect>
    </NqField>
  </div>

  <div v-else-if="features" class="flex flex-col gap-4">
    <NqLandingTextField :label="t.title" :model-value="features.title" @update:model-value="(v) => patch({ title: v })" />
    <NqLandingTextField :label="t.subtitle" :model-value="features.subtitle ?? ''" @update:model-value="(v) => patch({ subtitle: v })" />
    <NqRepeater
      :model-value="features.items"
      :label="t.items"
      :create-item="() => ({ id: newId('f'), title: '', description: '' })"
      :clone-item="(i: LandingItem) => ({ ...i, id: newId('f') })"
      :row-title="(i: LandingItem, n: number) => i.title || t.feature(num(n + 1))"
      :row-label="(i: LandingItem, n: number) => i.title || t.feature(num(n + 1))"
      :add-label="t.addFeature"
      :min="1"
      :max="8"
      @update:model-value="(items: LandingItem[]) => patch({ items })"
    >
      <template #default="{ item, update }">
        <div class="flex flex-col gap-3">
          <NqLandingTextField :label="t.itemTitle" :model-value="item.title" @update:model-value="(v) => update({ ...item, title: v })" />
          <NqLandingTextField :label="t.itemDescription" :model-value="item.description" multiline @update:model-value="(v) => update({ ...item, description: v })" />
        </div>
      </template>
    </NqRepeater>
  </div>

  <div v-else-if="faq" class="flex flex-col gap-4">
    <NqLandingTextField :label="t.title" :model-value="faq.title" @update:model-value="(v) => patch({ title: v })" />
    <NqRepeater
      :model-value="faq.items"
      :label="t.items"
      :create-item="() => ({ id: newId('q'), question: '', answer: '' })"
      :clone-item="(i: LandingFaqItem) => ({ ...i, id: newId('q') })"
      :row-title="(i: LandingFaqItem, n: number) => i.question || t.faqItem(num(n + 1))"
      :row-label="(i: LandingFaqItem, n: number) => i.question || t.faqItem(num(n + 1))"
      :add-label="t.addQuestion"
      :max="12"
      @update:model-value="(items: LandingFaqItem[]) => patch({ items })"
    >
      <template #default="{ item, update }">
        <div class="flex flex-col gap-3">
          <NqLandingTextField :label="t.question" :model-value="item.question" @update:model-value="(v) => update({ ...item, question: v })" />
          <NqLandingTextField :label="t.answer" :model-value="item.answer" multiline @update:model-value="(v) => update({ ...item, answer: v })" />
        </div>
      </template>
    </NqRepeater>
  </div>

  <div v-else-if="cta" class="flex flex-col gap-4">
    <NqLandingTextField :label="t.title" :model-value="cta.title" @update:model-value="(v) => patch({ title: v })" />
    <NqLandingTextField :label="t.body" :model-value="cta.body" multiline @update:model-value="(v) => patch({ body: v })" />
    <NqLandingTextField :label="t.buttonLabel" :model-value="cta.buttonLabel" @update:model-value="(v) => patch({ buttonLabel: v })" />
    <NqLandingTextField :label="t.buttonHref" :model-value="cta.buttonHref" ltr :error="linkError(cta.buttonHref)" @update:model-value="(v) => patch({ buttonHref: v })" />
  </div>

  <div v-else-if="text" class="flex flex-col gap-1.5">
    <span :id="`${id}-text`" class="text-label text-foreground">{{ t.body }}</span>
    <NqRichTextEditor
      v-if="props.load"
      :aria-labelledby="`${id}-text`"
      :load="props.load"
      :model-value="text.html"
      min-height="10rem"
      :toolbar="['bold', 'italic', 'h2', 'h3', 'bulletList', 'orderedList', 'link']"
      @update:model-value="(v) => patch({ html: String(v ?? '') })"
    />
    <NqTextarea v-else :aria-labelledby="`${id}-text`" dir="ltr" :rows="8" class="font-mono text-code" :model-value="text.html" @update:model-value="(v: string | number | undefined) => patch({ html: String(v ?? '') })" />
  </div>
</template>
