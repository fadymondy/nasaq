// nqQrCode / nqQrGenerator: a styled QR code drawn as one SVG, the same geometry as the React QrCode
// (packages/web/src/components/qr-code/qr-svg.ts, copied below; the matrix comes from `uqr`).
//
//   <div data-slot="qr-code" dir="ltr" x-data="nqQrCode({ value: 'https://…', size: 192 })" x-modelable="value">
//     <svg data-slot="qr-code-svg" … :viewBox="viewBox"> <path :d="layout.modules" :fill="fg"> <g> <path :d="layout.eyes[0].ring"> … </svg>
//   </div>
//
// Options: value, moduleStyle ("square"|"dots"|"rounded"), eyeStyle ("square"|"rounded"|"circle"), ecc, margin, fg, bg, eyeFg,
// logo (image URL), size, pngSize, downloadName. nqQrGenerator adds the controls' state (content, styles, colours, logo upload).
// Colours are any CSS colour including var(--token); they are resolved against the element when exporting.

import { encode } from "uqr";
import type { Magics, Register } from "./types";

type QrModuleStyle = "square" | "dots" | "rounded";
type QrEyeStyle = "square" | "rounded" | "circle";
type QrEcc = "L" | "M" | "Q" | "H";


interface QrLogo {
  /** Image URL. A data: URI or a same-origin URL exports cleanly to PNG. */
  src: string;
  /** Share of the code's width the logo box takes. Default 0.22, capped at 0.3 so it still scans. */
  scale?: number;
}

interface QrLayoutOptions {
  value: string;
  moduleStyle?: QrModuleStyle;
  eyeStyle?: QrEyeStyle;
  /** Error correction. Raised to "H" when there is a logo. Default "M". */
  ecc?: QrEcc;
  /** Quiet zone, in modules. Default 4 (the QR standard). */
  margin?: number;
  logo?: QrLogo;
}

interface QrLayout {
  /** Side of the square viewBox, in modules (data plus quiet zone). */
  size: number;
  /** Path of every data module, in the chosen style. */
  modules: string;
  /** The three finder patterns: an outer ring (fill with evenodd) and the inner square. */
  eyes: { ring: string; pupil: string }[];
  /** The logo box in viewBox units, or null. */
  logo: { x: number; y: number; size: number; src: string } | null;
}

const f = (n: number) => String(Math.round(n * 1000) / 1000);

/** A rounded rectangle, each corner with its own radius. Clockwise from the top left. */
function rrect(x: number, y: number, w: number, h: number, [tl, tr, br, bl]: [number, number, number, number]) {
  return (
    `M${f(x + tl)} ${f(y)}H${f(x + w - tr)}` +
    (tr ? `A${f(tr)} ${f(tr)} 0 0 1 ${f(x + w)} ${f(y + tr)}` : "") +
    `V${f(y + h - br)}` +
    (br ? `A${f(br)} ${f(br)} 0 0 1 ${f(x + w - br)} ${f(y + h)}` : "") +
    `H${f(x + bl)}` +
    (bl ? `A${f(bl)} ${f(bl)} 0 0 1 ${f(x)} ${f(y + h - bl)}` : "") +
    `V${f(y + tl)}` +
    (tl ? `A${f(tl)} ${f(tl)} 0 0 1 ${f(x + tl)} ${f(y)}` : "") +
    "Z"
  );
}

function eyeShape(x: number, y: number, side: number, style: QrEyeStyle) {
  const r = style === "square" ? 0 : style === "circle" ? side / 2 : side * 0.3;
  return rrect(x, y, side, side, [r, r, r, r]);
}

const inFinder = (x: number, y: number, n: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);

/** Pure geometry for a styled QR code: path strings in module units. Both the React component and the SVG export use it. */
function qrLayout({ value, moduleStyle = "square", eyeStyle = "square", ecc = "M", margin = 4, logo }: QrLayoutOptions): QrLayout {
  const qr = encode(value, { ecc: logo ? "H" : ecc, border: 0 });
  const n = qr.size;
  const size = n + margin * 2;
  const scale = Math.min(logo?.scale ?? 0.22, 0.3);
  const logoSide = logo ? Math.max(3, Math.round(n * scale)) : 0;
  const pad = logo ? 1 : 0;
  const logoStart = (size - logoSide) / 2;
  const cleared = (x: number, y: number) => {
    if (!logo) return false;
    const cx = x + margin + 0.5;
    const cy = y + margin + 0.5;
    return cx > logoStart - pad && cx < logoStart + logoSide + pad && cy > logoStart - pad && cy < logoStart + logoSide + pad;
  };
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < n && y < n && qr.data[y]?.[x] && !inFinder(x, y, n) && !cleared(x, y);

  let modules = "";
  if (moduleStyle === "square") {
    for (let y = 0; y < n; y++) {
      let x = 0;
      while (x < n) {
        if (!on(x, y)) {
          x++;
          continue;
        }
        const start = x;
        while (x < n && on(x, y)) x++;
        modules += `M${start + margin} ${y + margin}h${x - start}v1h-${x - start}z`;
      }
    }
  } else {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (!on(x, y)) continue;
        const px = x + margin;
        const py = y + margin;
        if (moduleStyle === "dots") {
          const r = 0.43;
          modules += `M${f(px + 0.5 - r)} ${f(py + 0.5)}a${r} ${r} 0 1 0 ${f(r * 2)} 0a${r} ${r} 0 1 0 ${f(-r * 2)} 0z`;
        } else {
          // A corner is round unless a neighbour touches it, so runs of modules merge into soft blobs.
          const u = on(x, y - 1);
          const d = on(x, y + 1);
          const l = on(x - 1, y);
          const r = on(x + 1, y);
          const k = 0.5;
          modules += rrect(px, py, 1, 1, [u || l ? 0 : k, u || r ? 0 : k, d || r ? 0 : k, d || l ? 0 : k]);
        }
      }
    }
  }

  const corners: [number, number][] = [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ];
  const eyes = corners.map(([cx, cy]) => {
    const x = cx + margin;
    const y = cy + margin;
    return {
      ring: eyeShape(x, y, 7, eyeStyle) + eyeShape(x + 1, y + 1, 5, eyeStyle),
      pupil: eyeShape(x + 2, y + 2, 3, eyeStyle),
    };
  });

  return { size, modules, eyes, logo: logo ? { x: logoStart, y: logoStart, size: logoSide, src: logo.src } : null };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface QrSvgStringOptions extends QrLayoutOptions {
  /** Any colour the browser resolves. Default black. Resolve `var(...)` first: see `resolveColor`. */
  fg?: string;
  /** Default white. */
  bg?: string;
  /** Pixel width and height of the SVG. Default 512. */
  size?: number;
  /** Colour of the eyes when it should differ from the modules. */
  eyeFg?: string;
}

/** A standalone SVG document string. Colours must already be concrete (no `var(...)`). */
function qrSvgString({ fg = "black", bg = "white", size: px = 512, eyeFg, ...options }: QrSvgStringOptions): string {
  const l = qrLayout(options);
  const eye = eyeFg ?? fg;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${l.size} ${l.size}" width="${px}" height="${px}">`,
    `<rect width="${l.size}" height="${l.size}" fill="${esc(bg)}"/>`,
    `<path d="${l.modules}" fill="${esc(fg)}"/>`,
    ...l.eyes.map((e) => `<path d="${e.ring}" fill="${esc(eye)}" fill-rule="evenodd"/><path d="${e.pupil}" fill="${esc(eye)}"/>`),
  ];
  if (l.logo) {
    const { x, y, size, src } = l.logo;
    parts.push(`<image href="${esc(src)}" xlink:href="${esc(src)}" x="${f(x)}" y="${f(y)}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`);
  }
  parts.push("</svg>");
  return parts.join("");
}

/* ---- browser helpers (copy of qr-code/download.ts) ---- */

function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}

/** Turns any CSS colour, including `var(--nq-brand)`, into a concrete `rgb(...)` string using the context element's cascade. */
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

async function toDataUri(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;
  try {
    const blob = await (await fetch(src)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return src;
  }
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

/** Native colour inputs need a #rrggbb value: read the concrete colour of a token when it is one. */
function hexOf(value: string, node: Element | null) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const rgb = resolveColor(value, node).match(/\d+(\.\d+)?/g);
  if (!rgb || rgb.length < 3) return `#${"0".repeat(6)}`;
  return `#${rgb
    .slice(0, 3)
    .map((n) => Math.round(Number(n)).toString(16).padStart(2, "0"))
    .join("")}`;
}

/* ---- Alpine ---- */

interface QrOptions {
  value?: string;
  moduleStyle?: QrModuleStyle;
  eyeStyle?: QrEyeStyle;
  ecc?: QrEcc;
  margin?: number;
  fg?: string;
  bg?: string;
  eyeFg?: string | null;
  /** Centre logo image URL. */
  logo?: string | null;
  size?: number | "fill";
  pngSize?: number;
  downloadName?: string;
  /** Label template for the accessible name; `{value}` is replaced. Default "QR code for {value}". */
  labelFor?: string;
  /** Explicit accessible name. */
  label?: string | null;
}

interface QrState extends Magics {
  value: string;
  moduleStyle: QrModuleStyle;
  eyeStyle: QrEyeStyle;
  ecc: QrEcc;
  margin: number;
  fg: string;
  bg: string;
  eyeFg: string | null;
  logo: string | null;
  size: number | "fill";
  pngSize: number;
  downloadName: string;
  labelFor: string;
  label: string | null;
  error: boolean;
  layout: QrLayout;
}

function state(o: QrOptions = {}) {
  // The getters below are read many times per render: build the geometry once per distinct input.
  let memoKey = "";
  let memo: QrLayout | null = null;
  return {
    value: o.value ?? "",
    moduleStyle: o.moduleStyle ?? ("square" as QrModuleStyle),
    eyeStyle: o.eyeStyle ?? ("square" as QrEyeStyle),
    ecc: o.ecc ?? ("M" as QrEcc),
    margin: o.margin ?? 4,
    fg: o.fg ?? "black",
    bg: o.bg ?? "white",
    eyeFg: o.eyeFg ?? null,
    logo: o.logo ?? null,
    size: o.size ?? 192,
    pngSize: o.pngSize ?? 1024,
    downloadName: o.downloadName ?? "qr-code",
    labelFor: o.labelFor ?? "QR code for {value}",
    label: o.label ?? null,
    error: false,
    /** The path geometry for the current options (module units). */
    get layout(): QrLayout {
      const s = this as unknown as QrState;
      const options = {
      value: s.value || " ",
      moduleStyle: s.moduleStyle,
      eyeStyle: s.eyeStyle,
      ecc: s.ecc,
      margin: s.margin,
      logo: s.logo ? { src: s.logo } : undefined,
      };
      const key = JSON.stringify(options);
      if (key !== memoKey || !memo) {
        memo = qrLayout(options);
        memoKey = key;
      }
      return memo;
    },
    get viewBox(): string {
      const n = (this as unknown as QrState).layout.size;
      return `0 0 ${n} ${n}`;
    },
    get shape(): string {
      const s = this as unknown as QrState;
      return s.moduleStyle === "square" && s.eyeStyle === "square" ? "crispEdges" : "geometricPrecision";
    },
    get name(): string {
      const s = this as unknown as QrState;
      if (s.label) return s.label;
      const v = s.value.length > 40 ? `${s.value.slice(0, 40)}…` : s.value;
      return s.labelFor.replace("{value}", v);
    },
    async build(this: QrState): Promise<string> {
      const node = this.$el;
      return qrSvgString({
        value: this.value || " ",
        moduleStyle: this.moduleStyle,
        eyeStyle: this.eyeStyle,
        ecc: this.ecc,
        margin: this.margin,
        fg: resolveColor(this.fg, node),
        bg: resolveColor(this.bg, node),
        eyeFg: this.eyeFg ? resolveColor(this.eyeFg, node) : undefined,
        logo: this.logo ? { src: await toDataUri(this.logo) } : undefined,
        size: this.pngSize,
      });
    },
    /** Saves the code as SVG or PNG; on failure `error` turns true (the alert shows). */
    async save(this: QrState & { build(): Promise<string> }, kind: "svg" | "png") {
      this.error = false;
      try {
        const svg = await this.build();
        if (kind === "svg") downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${this.downloadName}.svg`);
        else downloadBlob(await svgToPng(svg, this.pngSize), `${this.downloadName}.png`);
      } catch {
        this.error = true;
      }
    },
  };
}

/** Copies `extra` onto `base` as property descriptors so getters stay getters. */
function withProps<A extends object, B extends object>(base: A, extra: B): A & B {
  return Object.defineProperties(base, Object.getOwnPropertyDescriptors(extra)) as A & B;
}

export const qrCode: Register = (Alpine) => {
  Alpine.data("nqQrCode", (options: QrOptions = {}) => state(options));

  // The generator: the same state plus the controls (content, styles, colours, centre logo).
  // (withProps keeps the base getters live; a spread would freeze them.)
  Alpine.data("nqQrGenerator", (options: QrOptions = {}) =>
    withProps(state({ moduleStyle: "rounded", eyeStyle: "rounded", value: "https://nasaq.fadymondy.com", size: 224, ...options }), {
    /** The ECC the code really uses: a logo forces H. */
    get effectiveEcc(): QrEcc {
      const s = this as unknown as QrState;
      return s.logo ? "H" : s.ecc;
    },
    hex(this: QrState, which: "fg" | "bg") {
      return hexOf(this[which], this.$el);
    },
    pick(this: QrState, event: Event) {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.logo = String(reader.result);
      };
      reader.readAsDataURL(file);
    },
    removeLogo(this: QrState) {
      this.logo = null;
    },
    }),
  );
};
