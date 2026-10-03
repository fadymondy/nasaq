<script setup lang="ts">
import { ImageUp, X } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqField, NqFieldLabel, NqTextarea } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { resolveColor } from "./download";
import { QR_STRINGS, type QrCodeLabels } from "./labels";
import NqQrCode from "./NqQrCode.vue";
import type { QrEcc, QrEyeStyle, QrModuleStyle } from "./qr-svg";

interface Props {
  /** Starting content. */
  defaultValue?: string;
  defaultModuleStyle?: QrModuleStyle;
  defaultEyeStyle?: QrEyeStyle;
  /** Starting foreground and background. Any CSS colour or token. */
  defaultFg?: string;
  defaultBg?: string;
  /** Default centre logo, for example the product mark as a data: URI. The user can remove or replace it. */
  defaultLogo?: string;
  /** Base name of downloaded files. Default "qr-code". */
  downloadName?: string;
  labels?: Partial<QrCodeLabels>;
  class?: HTMLAttributes["class"];
}

/**
 * The QR generator: type the content, pick the module and corner style, colours and a centre logo, watch
 * the code update, and download it as SVG or PNG. Built on `NqQrCode`.
 */
const props = withDefaults(defineProps<Props>(), {
  defaultValue: "https://nasaq.fadymondy.com",
  defaultModuleStyle: "rounded",
  defaultEyeStyle: "rounded",
  defaultFg: "black",
  defaultBg: "white",
  defaultLogo: undefined,
  downloadName: undefined,
  labels: undefined,
});

const nasaq = useNasaq();
const t = computed<QrCodeLabels>(() => ({ ...QR_STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const id = useId();
const root = ref<{ $el: HTMLElement } | null>(null);
const value = ref(props.defaultValue);
const moduleStyle = ref<QrModuleStyle>(props.defaultModuleStyle);
const eyeStyle = ref<QrEyeStyle>(props.defaultEyeStyle);
const ecc = ref<QrEcc>("M");
const fg = ref(props.defaultFg);
const bg = ref(props.defaultBg);
const logo = ref<string | undefined>(props.defaultLogo);

function pick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => (logo.value = String(reader.result));
  reader.readAsDataURL(file);
}

/** Native colour inputs need a #rrggbb value: read the concrete colour of a token when it is one. */
function hexOf(v: string) {
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  const rgb = resolveColor(v, root.value?.$el ?? null).match(/\d+(\.\d+)?/g);
  if (!rgb || rgb.length < 3) return `#${"0".repeat(6)}`;
  return `#${rgb
    .slice(0, 3)
    .map((n) => Math.round(Number(n)).toString(16).padStart(2, "0"))
    .join("")}`;
}

const styleItems = computed(() => (Object.keys(t.value.styles) as QrModuleStyle[]).map((v) => ({ value: v, label: t.value.styles[v] })));
const eyeItems = computed(() => (Object.keys(t.value.eyes) as QrEyeStyle[]).map((v) => ({ value: v, label: t.value.eyes[v] })));
const eccItems = computed(() => (Object.keys(t.value.levels) as QrEcc[]).map((v) => ({ value: v, label: t.value.levels[v] })));
const colorClass = "h-control w-14 cursor-pointer rounded-control border border-input bg-card p-1";
</script>

<template>
  <NqCard ref="root" data-slot="qr-code-generator" :class="cn('w-full max-w-3xl', props.class)">
    <NqCardHeader>
      <NqCardTitle as="h2">{{ t.label }}</NqCardTitle>
      <NqCardDescription>{{ t.contentHint }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
      <div class="flex flex-col gap-4">
        <NqField>
          <NqFieldLabel>{{ t.contentLabel }}</NqFieldLabel>
          <NqTextarea v-model="value" dir="auto" :rows="3" />
        </NqField>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField>
            <NqFieldLabel>{{ t.moduleStyle }}</NqFieldLabel>
            <NqSelect :model-value="moduleStyle" @update:model-value="(v) => v && (moduleStyle = v as QrModuleStyle)">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="o in styleItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.eyeStyle }}</NqFieldLabel>
            <NqSelect :model-value="eyeStyle" @update:model-value="(v) => v && (eyeStyle = v as QrEyeStyle)">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="o in eyeItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.ecc }}</NqFieldLabel>
            <NqSelect :model-value="logo ? 'H' : ecc" :disabled="Boolean(logo)" @update:model-value="(v) => v && (ecc = v as QrEcc)">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="o in eccItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
          <div class="flex items-end gap-3">
            <label class="flex flex-col gap-1.5 text-label text-foreground" :for="`${id}-fg`">
              {{ t.fg }}
              <input :id="`${id}-fg`" type="color" :value="hexOf(fg)" :class="colorClass" @input="fg = ($event.target as HTMLInputElement).value" />
            </label>
            <label class="flex flex-col gap-1.5 text-label text-foreground" :for="`${id}-bg`">
              {{ t.bg }}
              <input :id="`${id}-bg`" type="color" :value="hexOf(bg)" :class="colorClass" @input="bg = ($event.target as HTMLInputElement).value" />
            </label>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <input :id="`${id}-logo`" type="file" accept="image/*" class="sr-only" @change="pick" />
            <NqButton as="label" size="sm" :for="`${id}-logo`">
              <ImageUp aria-hidden="true" />
              {{ logo ? t.logo : t.logoAdd }}
            </NqButton>
            <NqButton v-if="logo" type="button" size="sm" variant="ghost" @click="logo = undefined">
              <X aria-hidden="true" />
              {{ t.logoRemove }}
            </NqButton>
          </div>
          <p v-if="logo" class="text-caption text-muted-foreground">{{ t.logoNote }}</p>
        </div>
      </div>
      <NqQrCode
        :value="value || ' '"
        :module-style="moduleStyle"
        :eye-style="eyeStyle"
        :ecc="ecc"
        :fg="fg"
        :bg="bg"
        :logo="logo ? { src: logo } : undefined"
        :size="224"
        downloadable
        :download-name="props.downloadName"
        :labels="props.labels"
        class="justify-self-center"
      />
    </NqCardContent>
  </NqCard>
</template>
