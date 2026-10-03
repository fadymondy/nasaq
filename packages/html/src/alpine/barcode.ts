// nqBarcode / nqBarcodeGenerator: a barcode drawn as SVG by jsbarcode. Same markup, classes and strings as the React Barcode.
//
//   <div data-slot="barcode" dir="ltr" x-data="nqBarcode({ value: 'NSQ-2026-0042', format: 'CODE128' })" x-modelable="value">
//     <p role="alert" x-show="message" x-text="message"> <svg data-slot="barcode-svg" role="img" :aria-label="name">
//   </div>
//
// jsbarcode is loaded lazily from a CDN the first time a code is drawn (no bundled dependency); load it yourself first (a
// <script> tag, or set window.JsBarcode) to skip that request. Options: value, format, showValue, height, barWidth, fg, bg,
// margin, pngSize, downloadName, jsbarcodeSrc, labels. The format list and validation below are barcode-format.ts, copied.

import type { Magics, Register } from "./types";

type BarcodeFormat = "CODE128" | "EAN13" | "EAN8" | "UPC" | "CODE39" | "ITF14" | "ITF" | "codabar" | "pharmacode";

const BARCODE_FORMATS: readonly { id: BarcodeFormat; name: string; example: string }[] = [
  { id: "CODE128", name: "Code 128", example: "NSQ-2026-0042" },
  { id: "EAN13", name: "EAN-13", example: "5901234123457" },
  { id: "EAN8", name: "EAN-8", example: "96385074" },
  { id: "UPC", name: "UPC-A", example: "123456789012" },
  { id: "CODE39", name: "Code 39", example: "NASAQ-42" },
  { id: "ITF14", name: "ITF-14", example: "12345678901231" },
  { id: "ITF", name: "Interleaved 2 of 5", example: "123456" },
  { id: "codabar", name: "Codabar", example: "A123456A" },
  { id: "pharmacode", name: "Pharmacode", example: "1234" },
];

type BarcodeProblem = "empty" | "digits" | "length" | "checksum" | "chars";

/** GS1 check digit for the digits before it (EAN-13, EAN-8, UPC-A, ITF-14): weights 3 and 1 from the right. */
function gtinCheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

const GTIN_LENGTHS: Partial<Record<BarcodeFormat, number>> = { EAN13: 13, EAN8: 8, UPC: 12, ITF14: 14 };

/**
 * Checks a value against a format before drawing, so the UI can say what is wrong instead of showing nothing.
 * The check-digit formats accept the body without the digit too (jsbarcode adds it), or the full number with a correct digit.
 */
function validateBarcode(format: BarcodeFormat, value: string): BarcodeProblem | null {
  if (!value) return "empty";
  const full = GTIN_LENGTHS[format];
  if (full) {
    if (!/^\d+$/.test(value)) return "digits";
    if (value.length !== full && value.length !== full - 1) return "length";
    if (value.length === full && gtinCheckDigit(value.slice(0, -1)) !== Number(value.at(-1))) return "checksum";
    return null;
  }
  switch (format) {
    case "CODE128":
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Code 128 encodes the 7-bit ASCII range
      return /^[\x00-\x7f]+$/.test(value) ? null : "chars";
    case "CODE39":
      return /^[0-9A-Z\-. $/+%]+$/.test(value.toUpperCase()) ? null : "chars";
    case "ITF":
      if (!/^\d+$/.test(value)) return "digits";
      return value.length % 2 === 0 ? null : "length";
    case "codabar":
      return /^([A-D][0-9\-$:/.+]+[A-D]|[0-9\-$:/.+]+)$/i.test(value) ? null : "chars";
    case "pharmacode": {
      if (!/^\d+$/.test(value)) return "digits";
      const n = Number(value);
      return n >= 3 && n <= 131070 ? null : "length";
    }
    default:
      return null;
  }
}

/* ---- browser helpers (copy of the qr-code download helpers) ---- */

function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}

function resolveColor(value: string, context?: Element | null): string {
  if (typeof document === "undefined" || !/var\(|color-mix|oklch|oklab|light-dark|currentcolor|^[a-z]+$/i.test(value)) return value;
  const probe = document.createElement("span");
  probe.style.color = value;
  probe.style.display = "none";
  (context ?? document.body).appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved || value;
}

function svgToPng(svg: string, px: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalHeight && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
      const canvas = document.createElement("canvas");
      canvas.width = px;
      canvas.height = Math.max(1, Math.round(px * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas unavailable"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("png failed"))), "image/png");
    };
    img.onerror = () => reject(new Error("svg failed to load"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/* ---- jsbarcode loader ---- */

type JsBarcodeFn = (el: SVGElement, value: string, options?: Record<string, unknown>) => void;
const DEFAULT_SRC = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js";
let loading: Promise<JsBarcodeFn> | null = null;

function loadJsBarcode(src: string): Promise<JsBarcodeFn> {
  const w = window as unknown as { JsBarcode?: JsBarcodeFn };
  if (w.JsBarcode) return Promise.resolve(w.JsBarcode);
  loading ??= new Promise<JsBarcodeFn>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => (w.JsBarcode ? resolve(w.JsBarcode) : reject(new Error("JsBarcode missing")));
    s.onerror = () => {
      loading = null;
      reject(new Error("JsBarcode failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

interface Strings {
  /** "{format} barcode for {value}" */
  label: string;
  failed: string;
  problems: Record<BarcodeProblem, string>;
  hints: Record<BarcodeFormat, string>;
}

const STRINGS: Record<"en" | "ar", Strings> = {
  en: {
    label: "{format} barcode for {value}",
    failed: "Could not create the file. Try again.",
    problems: {
      empty: "Enter a value to make a barcode.",
      digits: "This format takes digits only.",
      length: "This value has the wrong length for the format.",
      checksum: "The check digit at the end is wrong.",
      chars: "This value has characters the format cannot encode.",
    },
    hints: {
      CODE128: "Any ASCII text. The most flexible format.",
      EAN13: "12 digits, or 13 with the check digit. Retail products.",
      EAN8: "7 digits, or 8 with the check digit. Small packages.",
      UPC: "11 digits, or 12 with the check digit. North American retail.",
      CODE39: "Capital letters, digits and - . $ / + % and space.",
      ITF14: "13 digits, or 14 with the check digit. Cartons and cases.",
      ITF: "An even number of digits.",
      codabar: "Digits and - $ : / . + , optionally between A to D.",
      pharmacode: "A number from 3 to 131070.",
    },
  },
  ar: {
    label: "باركود {format} للقيمة {value}",
    failed: "تعذر إنشاء الملف. حاول مرة أخرى.",
    problems: {
      empty: "أدخل قيمة لإنشاء الباركود.",
      digits: "هذه الصيغة تقبل الأرقام فقط.",
      length: "طول القيمة غير مناسب لهذه الصيغة.",
      checksum: "رقم التحقق في النهاية غير صحيح.",
      chars: "تحتوي القيمة على رموز لا تدعمها الصيغة.",
    },
    hints: {
      CODE128: "أي نص ASCII. أكثر الصيغ مرونة.",
      EAN13: "12 رقمًا، أو 13 مع رقم التحقق. منتجات التجزئة.",
      EAN8: "7 أرقام، أو 8 مع رقم التحقق. العبوات الصغيرة.",
      UPC: "11 رقمًا، أو 12 مع رقم التحقق. التجزئة في أمريكا الشمالية.",
      CODE39: "أحرف لاتينية كبيرة وأرقام و - . $ / + % ومسافة.",
      ITF14: "13 رقمًا، أو 14 مع رقم التحقق. الكراتين والصناديق.",
      ITF: "عدد زوجي من الأرقام.",
      codabar: "أرقام و - $ : / . + ، ويمكن أن تحيط بها الأحرف من A إلى D.",
      pharmacode: "رقم من 3 إلى 131070.",
    },
  },
};

interface Options {
  value?: string;
  format?: BarcodeFormat;
  showValue?: boolean;
  height?: number;
  barWidth?: number;
  fg?: string;
  bg?: string;
  margin?: number;
  pngSize?: number;
  downloadName?: string;
  jsbarcodeSrc?: string;
  /** Overrides for the built-in strings. */
  labels?: Partial<Strings>;
}

function strings(labels?: Partial<Strings>): Strings {
  const ar = (document.documentElement.lang || "en").toLowerCase().startsWith("ar") || document.documentElement.dir === "rtl";
  return { ...(ar ? STRINGS.ar : STRINGS.en), ...labels };
}

interface BarcodeState {
  value: string;
  format: BarcodeFormat;
  showValue: boolean;
  height: number;
  barWidth: number;
  fg: string;
  bg: string;
  margin: number;
  pngSize: number;
  downloadName: string;
  failed: boolean;
  error: boolean;
  t: ReturnType<typeof strings>;
  host: HTMLElement | null;
  readonly problem: BarcodeProblem | null;
  readonly name: string;
  readonly message: string;
  readonly hint: string;
  init(this: Magics & BarcodeState): void;
  draw(): Promise<void>;
  markup(): string;
  save(kind: "svg" | "png"): Promise<void>;
}

function state(o: Options = {}): BarcodeState {
  return {
    value: o.value ?? "",
    format: (o.format ?? "CODE128") as BarcodeFormat,
    showValue: o.showValue ?? true,
    height: o.height ?? 80,
    barWidth: o.barWidth ?? 2,
    fg: o.fg ?? "black",
    bg: o.bg ?? "white",
    margin: o.margin ?? 10,
    pngSize: o.pngSize ?? 1200,
    downloadName: o.downloadName ?? "barcode",
    failed: false,
    error: false,
    t: strings(o.labels),
    host: null as HTMLElement | null,
    init(this: Magics & BarcodeState) {
      this.host = this.$el;
      const redraw = () => void this.draw();
      for (const k of ["value", "format", "showValue", "height", "barWidth", "margin", "fg", "bg"]) this.$watch(k, redraw);
      void this.$nextTick(redraw);
    },
    get problem(): BarcodeProblem | null {
      return validateBarcode(this.format, this.value);
    },
    get name(): string {
      const n = BARCODE_FORMATS.find((f) => f.id === this.format)?.name ?? this.format;
      return this.t.label.replace("{format}", n).replace("{value}", this.value);
    },
    /** The reason there is no barcode, or "" when there is one. */
    get message(): string {
      if (this.problem) return this.t.problems[this.problem];
      return this.failed ? this.t.problems.chars : "";
    },
    get hint(): string {
      return this.t.hints[this.format];
    },
    async draw(this: BarcodeState & Magics) {
      const svg = this.host?.querySelector<SVGSVGElement>('[data-slot="barcode-svg"]');
      if (!svg) return;
      this.$dispatch("validate", this.problem);
      if (this.problem) return;
      try {
        const JsBarcode = await loadJsBarcode(o.jsbarcodeSrc ?? DEFAULT_SRC);
        // The value may have changed while the script loaded.
        if (this.problem) return;
        let ok = true;
        JsBarcode(svg, this.value, {
          format: this.format,
          displayValue: this.showValue,
          height: this.height,
          width: this.barWidth,
          margin: this.margin,
          lineColor: resolveColor(this.fg, svg),
          background: resolveColor(this.bg, svg),
          fontSize: 16,
          font: "ui-monospace, monospace",
          valid: (v: boolean) => {
            ok = v;
          },
        });
        // jsbarcode sizes in px; a viewBox lets CSS scale it.
        const w = svg.getAttribute("width");
        const h = svg.getAttribute("height");
        if (w && h) {
          svg.setAttribute("viewBox", `0 0 ${Number.parseFloat(w)} ${Number.parseFloat(h)}`);
          svg.removeAttribute("height");
        }
        if (!ok) svg.replaceChildren();
        this.failed = !ok;
      } catch {
        svg.replaceChildren();
        this.failed = true;
      }
    },
    markup(this: BarcodeState & Magics): string {
      const svg = this.host?.querySelector<SVGSVGElement>('[data-slot="barcode-svg"]');
      if (!svg) throw new Error("not drawn");
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const vb = (clone.getAttribute("viewBox") ?? "0 0 100 100").split(" ").map(Number);
      clone.setAttribute("width", String(vb[2]));
      clone.setAttribute("height", String(vb[3]));
      return clone.outerHTML;
    },
    /** Saves the barcode as SVG or PNG; on failure `error` turns true (the alert shows). */
    async save(this: BarcodeState & Magics, kind: "svg" | "png") {
      this.error = false;
      try {
        const svg = this.markup();
        if (kind === "svg") downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${this.downloadName}.svg`);
        else downloadBlob(await svgToPng(svg, this.pngSize), `${this.downloadName}.png`);
      } catch {
        this.error = true;
      }
    },
  };
}

export const barcode: Register = (Alpine) => {
  Alpine.data("nqBarcode", (options: Options = {}) => state(options));

  // The generator: the same state, and changing the format moves to that format's example when the value no longer fits.
  Alpine.data("nqBarcodeGenerator", (options: Options = {}) => {
    const base = state({ value: "NSQ-2026-0042", ...options });
    return Object.defineProperties(
      base,
      Object.getOwnPropertyDescriptors({
        setFormat(this: BarcodeState & Magics, next: BarcodeFormat) {
          this.format = next;
          if (validateBarcode(next, this.value)) this.value = BARCODE_FORMATS.find((f) => f.id === next)?.example ?? this.value;
        },
      }),
    ) as typeof base & { setFormat(next: BarcodeFormat): void };
  });
};
