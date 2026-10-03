<script setup lang="ts">
import { JsBarcode } from "./draw";
import { Download } from "lucide-vue-next";
import { computed, nextTick, onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { downloadPng, downloadSvg, resolveColor } from "../qr-code";
import { BARCODE_FORMATS, validateBarcode, type BarcodeFormat, type BarcodeProblem } from "./barcode-format";
import { BARCODE_STRINGS, type BarcodeLabels } from "./labels";

interface Props {
  /** What the bars encode. */
  value: string;
  /** Default "CODE128". */
  format?: BarcodeFormat;
  /** Print the value under the bars. Default true. */
  showValue?: boolean;
  /** Bar height in px. Default 80. */
  height?: number;
  /** Width of the thinnest bar in px. Default 2. */
  barWidth?: number;
  /** Bar colour: any CSS colour or token. Default black. */
  fg?: string;
  /** Background colour. Default white. */
  bg?: string;
  /** Quiet zone around the bars, in px. Default 10. */
  margin?: number;
  /** Show Download SVG and Download PNG buttons under the barcode. */
  downloadable?: boolean;
  /** Base name of downloaded files. Default "barcode". */
  downloadName?: string;
  /** Pixel width of the downloaded PNG. Default 1200. */
  pngSize?: number;
  labels?: Partial<BarcodeLabels>;
  class?: HTMLAttributes["class"];
}

/**
 * A barcode drawn as SVG by jsbarcode: Code 128, EAN-13, EAN-8, UPC-A, Code 39, ITF-14, ITF, Codabar
 * and Pharmacode. A value the format cannot encode shows the reason instead of a broken image.
 * It stays left-to-right in Arabic. Set `downloadable` for SVG and PNG buttons.
 */
const props = withDefaults(defineProps<Props>(), {
  format: "CODE128",
  showValue: true,
  height: 80,
  barWidth: 2,
  fg: "black",
  bg: "white",
  margin: 10,
  downloadable: false,
  downloadName: "barcode",
  pngSize: 1200,
  labels: undefined,
});
/** Called after each draw with the problem, or null when the value is valid. */
const emit = defineEmits<{ validate: [problem: BarcodeProblem | null] }>();

const nasaq = useNasaq();
const t = computed<BarcodeLabels>(() => ({ ...BARCODE_STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const svg = ref<SVGSVGElement | null>(null);
const failed = ref(false);
const error = ref(false);
const problem = computed(() => validateBarcode(props.format, props.value));
const name = computed(() => BARCODE_FORMATS.find((f) => f.id === props.format)?.name ?? props.format);
const message = computed(() => (problem.value ? t.value.problems[problem.value] : failed.value ? t.value.problems.chars : null));

function draw() {
  const el = svg.value;
  emit("validate", problem.value);
  if (!el || problem.value) return;
  try {
    let ok = true;
    JsBarcode(el, props.value, {
      format: props.format,
      displayValue: props.showValue,
      height: props.height,
      width: props.barWidth,
      margin: props.margin,
      lineColor: resolveColor(props.fg, el),
      background: resolveColor(props.bg, el),
      fontSize: 16,
      font: "ui-monospace, monospace",
      valid: (v: boolean) => {
        ok = v;
      },
    });
    // jsbarcode sizes in px; a viewBox lets CSS scale it.
    const w = el.getAttribute("width");
    const h = el.getAttribute("height");
    if (w && h) {
      el.setAttribute("viewBox", `0 0 ${Number.parseFloat(w)} ${Number.parseFloat(h)}`);
      el.removeAttribute("height");
    }
    if (!ok) {
      el.replaceChildren();
      failed.value = true;
    } else failed.value = false;
  } catch {
    el.replaceChildren();
    failed.value = true;
  }
}

onMounted(draw);
watch(
  () => [props.value, props.format, props.showValue, props.height, props.barWidth, props.margin, props.fg, props.bg, problem.value],
  () => nextTick(draw),
);

function markup() {
  const el = svg.value;
  if (!el) throw new Error("not drawn");
  const clone = el.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const vb = (clone.getAttribute("viewBox") ?? "0 0 100 100").split(" ").map(Number);
  clone.setAttribute("width", String(vb[2]));
  clone.setAttribute("height", String(vb[3]));
  return clone.outerHTML;
}

async function save(kind: "svg" | "png") {
  error.value = false;
  try {
    if (kind === "svg") downloadSvg(markup(), `${props.downloadName}.svg`);
    else await downloadPng(markup(), `${props.downloadName}.png`, props.pngSize);
  } catch {
    error.value = true;
  }
}
</script>

<template>
  <div
    data-slot="barcode"
    :data-format="props.format"
    :data-invalid="message ? '' : undefined"
    dir="ltr"
    :class="cn('inline-flex max-w-full flex-col items-center gap-3', props.class)"
  >
    <p v-if="message" role="alert" class="rounded-control border border-dashed border-border px-4 py-6 text-center text-body-sm text-nq-danger-text" dir="auto">
      {{ message }}
    </p>
    <svg
      ref="svg"
      data-slot="barcode-svg"
      role="img"
      :aria-label="t.label(name, props.value)"
      :style="{ background: props.bg, display: message ? 'none' : undefined }"
      class="h-auto max-w-full rounded-control border border-border"
    />
    <div v-if="props.downloadable && !message" class="flex flex-wrap items-center justify-center gap-2" data-slot="barcode-actions">
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
