import type { MarkSpec } from "./marks";

// Ported from fadymondy.com-v2 web/lib/brand/mark-svg.ts.

export type MarkScheme = "light" | "dark" | "auto";

export interface MarkSvgOptions {
  /** Padding around the lattice, as a fraction of the square side. */
  padding?: number;
  /** Fill the square with this colour; omitted = transparent. */
  ground?: string;
  /** light = body as drawn on paper; dark = bodyOnDark; auto = swap via prefers-color-scheme. */
  scheme?: MarkScheme;
  /** Rendered pixel size written to width/height. */
  size?: number;
  /** Render accent cells in the body colour (below ~20px the gold cube stops reading). */
  withoutAccent?: boolean;
}

export interface MarkGeometry {
  unit: number;
  rects: { x: number; y: number; accent: boolean }[];
}

/** Square 100×100 layout of a mark: the lattice is scaled to its longest side and centred. */
export function markGeometry(mark: MarkSpec, padding = 0): MarkGeometry {
  const cols = mark.cells.map(([c]) => c);
  const rows = mark.cells.map(([, r]) => r);
  const minCol = Math.min(...cols);
  const minRow = Math.min(...rows);
  const width = Math.max(...cols) - minCol + 1;
  const height = Math.max(...rows) - minRow + 1;
  const inner = 100 * (1 - 2 * padding);
  const unit = inner / Math.max(width, height);
  const x0 = (100 - width * unit) / 2;
  const y0 = (100 - height * unit) / 2;
  const accentSet = new Set(mark.accentCells.map(([c, r]) => `${c},${r}`));
  // Rounded to keep the markup short; the lattice has no sub-unit detail.
  const n = (v: number) => Number(v.toFixed(3));
  return {
    unit: n(unit),
    rects: mark.cells.map(([c, r]) => ({
      x: n(x0 + (c - minCol) * unit),
      y: n(y0 + (r - minRow) * unit),
      accent: accentSet.has(`${c},${r}`),
    })),
  };
}

export function markSvg(mark: MarkSpec, options: MarkSvgOptions = {}): string {
  const { padding = 0, ground, scheme = "light", size, withoutAccent = false } = options;
  const { unit, rects } = markGeometry(mark, padding);
  const lightBody = mark.body;
  const darkBody = mark.bodyOnDark ?? mark.body;
  const body = scheme === "dark" ? darkBody : lightBody;
  const cubes = rects
    .map(({ x, y, accent }) => {
      const attrs = `x="${x}" y="${y}" width="${unit}" height="${unit}"`;
      return accent && !withoutAccent ? `<rect ${attrs} fill="${mark.accent}"/>` : `<rect class="b" ${attrs} fill="${body}"/>`;
    })
    .join("");
  const style =
    scheme === "auto" && darkBody !== lightBody ? `<style>@media (prefers-color-scheme: dark){.b{fill:${darkBody}}}</style>` : "";
  const dims = size ? ` width="${size}" height="${size}"` : "";
  const bg = ground ? `<rect width="100" height="100" fill="${ground}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${dims}><title>${escapeXml(mark.name)}</title>${style}${bg}${cubes}</svg>`;
}

export function markDataUri(mark: MarkSpec, options: MarkSvgOptions = {}): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(markSvg(mark, options))}`;
}

/** Every cell must satisfy the lattice rule (col + row odd), with no duplicates. */
export function isValidMark(mark: MarkSpec): boolean {
  const cells = new Set(mark.cells.map(([c, r]) => `${c},${r}`));
  return (
    mark.cells.every(([c, r]) => (c + r) % 2 === 1) &&
    mark.accentCells.every(([c, r]) => cells.has(`${c},${r}`)) &&
    cells.size === mark.cells.length
  );
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}
