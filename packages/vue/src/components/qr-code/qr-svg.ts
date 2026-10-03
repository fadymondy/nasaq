// Copy of packages/web/src/components/qr-code/qr-svg.ts (the matrix comes from `uqr`).
import { encode } from "uqr";

export type QrModuleStyle = "square" | "dots" | "rounded";
export type QrEyeStyle = "square" | "rounded" | "circle";
export type QrEcc = "L" | "M" | "Q" | "H";

export interface QrLogo {
  /** Image URL. A data: URI or a same-origin URL exports cleanly to PNG. */
  src: string;
  /** Share of the code's width the logo box takes. Default 0.22, capped at 0.3 so it still scans. */
  scale?: number;
}

export interface QrLayoutOptions {
  value: string;
  moduleStyle?: QrModuleStyle;
  eyeStyle?: QrEyeStyle;
  /** Error correction. Raised to "H" when there is a logo. Default "M". */
  ecc?: QrEcc;
  /** Quiet zone, in modules. Default 4 (the QR standard). */
  margin?: number;
  logo?: QrLogo;
}

export interface QrLayout {
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
export function qrLayout({ value, moduleStyle = "square", eyeStyle = "square", ecc = "M", margin = 4, logo }: QrLayoutOptions): QrLayout {
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

export interface QrSvgStringOptions extends QrLayoutOptions {
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
export function qrSvgString({ fg = "black", bg = "white", size: px = 512, eyeFg, ...options }: QrSvgStringOptions): string {
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
