<script setup lang="ts">
import { Download } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { downloadPng, downloadSvg, resolveColor, toDataUri } from "./download";
import { QR_STRINGS, type QrCodeLabels } from "./labels";
import { qrLayout, qrSvgString, type QrEcc, type QrEyeStyle, type QrLogo, type QrModuleStyle } from "./qr-svg";

interface Props {
  /** What the code holds: a URL, text, a Wi-Fi string. */
  value: string;
  /** Data module shape. Default "square". */
  moduleStyle?: QrModuleStyle;
  /** Finder pattern (the three big corners) shape. Default "square". */
  eyeStyle?: QrEyeStyle;
  /** Error correction. Default "M"; "H" is forced when there is a logo. */
  ecc?: QrEcc;
  /** Quiet zone in modules. Default 4. */
  margin?: number;
  /** Any CSS colour, including tokens: `"var(--nq-brand)"`. Default black. Keep strong contrast with `bg`. */
  fg?: string;
  /** Default white. */
  bg?: string;
  /** Colour of the three corner eyes. Default: same as `fg`. */
  eyeFg?: string;
  /** Centre logo: an image URL (a data: URI or same-origin URL exports best). */
  logo?: QrLogo;
  /** Width and height in px. Default 192. `"fill"` makes it as wide as its parent. */
  size?: number | "fill";
  /** Accessible name. Default "QR code for <value>". */
  label?: string;
  /** Show Download SVG and Download PNG buttons under the code. */
  downloadable?: boolean;
  /** Base name of downloaded files. Default "qr-code". */
  downloadName?: string;
  /** Pixel width of the downloaded PNG. Default 1024. */
  pngSize?: number;
  labels?: Partial<QrCodeLabels>;
  class?: HTMLAttributes["class"];
}

/**
 * A styled QR code drawn as one SVG: square, dot or rounded modules, square, rounded or circular corner eyes,
 * colours from tokens or props, and an optional centre logo. The matrix comes from `uqr`. The code is
 * left-to-right in Arabic too. Set `downloadable` for SVG and PNG buttons.
 */
const props = withDefaults(defineProps<Props>(), {
  moduleStyle: "square",
  eyeStyle: "square",
  ecc: "M",
  margin: 4,
  fg: "black",
  bg: "white",
  size: 192,
  downloadable: false,
  downloadName: "qr-code",
  eyeFg: undefined,
  logo: undefined,
  label: undefined,
  pngSize: undefined,
  labels: undefined,
});

const nasaq = useNasaq();
const t = computed<QrCodeLabels>(() => ({ ...QR_STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const root = ref<HTMLElement | null>(null);
const error = ref(false);
const layout = computed(() =>
  qrLayout({ value: props.value, moduleStyle: props.moduleStyle, eyeStyle: props.eyeStyle, ecc: props.ecc, margin: props.margin, logo: props.logo }),
);
const name = computed(() => props.label ?? t.value.labelFor(props.value.length > 40 ? `${props.value.slice(0, 40)}…` : props.value));
const fill = computed(() => props.size === "fill");

/** Resolves colours against the live element, inlines the logo and gives back a standalone SVG string. */
async function buildExport() {
  const node = root.value;
  return qrSvgString({
    value: props.value,
    moduleStyle: props.moduleStyle,
    eyeStyle: props.eyeStyle,
    ecc: props.ecc,
    margin: props.margin,
    fg: resolveColor(props.fg, node),
    bg: resolveColor(props.bg, node),
    eyeFg: props.eyeFg ? resolveColor(props.eyeFg, node) : undefined,
    logo: props.logo ? { ...props.logo, src: await toDataUri(props.logo.src) } : undefined,
    size: props.pngSize ?? 1024,
  });
}

async function save(kind: "svg" | "png") {
  error.value = false;
  try {
    const svg = await buildExport();
    if (kind === "svg") downloadSvg(svg, `${props.downloadName}.svg`);
    else await downloadPng(svg, `${props.downloadName}.png`, props.pngSize ?? 1024);
  } catch {
    error.value = true;
  }
}

defineExpose({ root });
</script>

<template>
  <div
    ref="root"
    data-slot="qr-code"
    :data-module-style="props.moduleStyle"
    :data-eye-style="props.eyeStyle"
    dir="ltr"
    :class="cn('inline-flex flex-col items-center gap-3', fill && 'flex w-full', props.class)"
  >
    <svg
      data-slot="qr-code-svg"
      role="img"
      :aria-label="name"
      :viewBox="`0 0 ${layout.size} ${layout.size}`"
      :width="fill ? undefined : props.size"
      :height="fill ? undefined : props.size"
      :shape-rendering="props.moduleStyle === 'square' && props.eyeStyle === 'square' ? 'crispEdges' : 'geometricPrecision'"
      :class="cn('aspect-square rounded-control border border-border', fill && 'w-full')"
      :style="{ background: props.bg }"
    >
      <path :d="layout.modules" :fill="props.fg" />
      <g v-for="(e, i) in layout.eyes" :key="i" :fill="props.eyeFg ?? props.fg">
        <path :d="e.ring" fill-rule="evenodd" />
        <path :d="e.pupil" />
      </g>
      <image
        v-if="layout.logo"
        :href="layout.logo.src"
        :x="layout.logo.x"
        :y="layout.logo.y"
        :width="layout.logo.size"
        :height="layout.logo.size"
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
    <div v-if="props.downloadable" class="flex flex-wrap items-center justify-center gap-2" dir="inherit" data-slot="qr-code-actions">
      <NqButton type="button" size="sm" @click="save('svg')">
        <Download aria-hidden="true" />
        {{ t.svg }}
      </NqButton>
      <NqButton type="button" size="sm" @click="save('png')">
        <Download aria-hidden="true" />
        {{ t.png }}
      </NqButton>
    </div>
    <p v-if="error" role="alert" class="text-caption text-nq-danger-text">{{ t.failed }}</p>
  </div>
</template>
