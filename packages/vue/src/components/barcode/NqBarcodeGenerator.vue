<script setup lang="ts">
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { BARCODE_FORMATS, validateBarcode, type BarcodeFormat } from "./barcode-format";
import { BARCODE_STRINGS, type BarcodeLabels } from "./labels";
import NqBarcode from "./NqBarcode.vue";

interface Props {
  defaultValue?: string;
  defaultFormat?: BarcodeFormat;
  /** Formats offered. Default all. */
  formats?: readonly BarcodeFormat[];
  downloadName?: string;
  labels?: Partial<BarcodeLabels>;
  class?: HTMLAttributes["class"];
}

/** Type a value, pick a format, see the barcode, download SVG or PNG. Built on `NqBarcode`. */
const props = withDefaults(defineProps<Props>(), { defaultValue: "NSQ-2026-0042", defaultFormat: "CODE128", formats: undefined, downloadName: undefined, labels: undefined });

const nasaq = useNasaq();
const t = computed<BarcodeLabels>(() => ({ ...BARCODE_STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const id = useId();
const value = ref(props.defaultValue);
const format = ref<BarcodeFormat>(props.defaultFormat);
const items = computed(() => BARCODE_FORMATS.filter((f) => !props.formats || props.formats.includes(f.id)).map((f) => ({ value: f.id, label: f.name })));

function pick(v: string | number | null) {
  if (!v) return;
  const next = v as BarcodeFormat;
  format.value = next;
  // Move to that format's example when the current value cannot work, so the preview is never empty.
  if (validateBarcode(next, value.value)) value.value = BARCODE_FORMATS.find((f) => f.id === next)?.example ?? value.value;
}
</script>

<template>
  <NqCard data-slot="barcode-generator" :class="cn('w-full max-w-2xl', props.class)">
    <NqCardHeader>
      <NqCardTitle as="h2">{{ t.title }}</NqCardTitle>
      <NqCardDescription>{{ t.description }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-5">
      <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <NqField>
          <NqFieldLabel>{{ t.value }}</NqFieldLabel>
          <NqInput :id="`${id}-value`" v-model="value" ltr :spellcheck="false" autocomplete="off" />
          <NqFieldDescription>{{ t.hints[format] }}</NqFieldDescription>
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.format }}</NqFieldLabel>
          <NqSelect :model-value="format" @update:model-value="pick">
            <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </NqField>
      </div>
      <div class="flex justify-center">
        <NqBarcode :value="value" :format="format" downloadable :download-name="props.downloadName" :labels="props.labels" />
      </div>
    </NqCardContent>
  </NqCard>
</template>
