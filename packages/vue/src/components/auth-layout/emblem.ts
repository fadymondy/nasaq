// The emblem's cells: rings of small cubes (the mark's own lattice unit) around the product mark. Inner rings are denser
// and fuller, outer ones thin out, so the mark reads as the centre of a field rather than a badge.
export const EMBLEM_RINGS = [
  { r: 31, count: 18, size: 4.2, fade: 1 },
  { r: 39, count: 24, size: 3.6, fade: 0.85 },
  { r: 47, count: 30, size: 3, fade: 0.65 },
  { r: 55, count: 36, size: 2.4, fade: 0.45 },
] as const;
// The sweep of colours around the ring, all from tokens, so every brand theme gets its own emblem.
const EMBLEM_STOPS = ["var(--nq-action)", "var(--nq-brand-l)", "var(--nq-accent)", "var(--nq-brand)", "var(--nq-action)"];

function emblemColour(t: number): string {
  const span = t * (EMBLEM_STOPS.length - 1);
  const i = Math.min(Math.floor(span), EMBLEM_STOPS.length - 2);
  const mix = Math.round((span - i) * 100);
  return `color-mix(in oklab, ${EMBLEM_STOPS[i + 1]} ${mix}%, ${EMBLEM_STOPS[i]})`;
}

export interface EmblemCell {
  key: string;
  x: number;
  y: number;
  angle: number;
  size: number;
  fill: string;
  opacity: number;
  t: number;
  ring: number;
}

export const EMBLEM_CELLS: EmblemCell[] = EMBLEM_RINGS.flatMap((ring, ringIndex) =>
  Array.from({ length: ring.count }, (_, i) => {
    const t = (i + (ringIndex % 2 ? 0.5 : 0)) / ring.count;
    const angle = t * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    return {
      key: `${ringIndex}-${i}`,
      x: Math.cos(rad) * ring.r,
      y: Math.sin(rad) * ring.r,
      angle,
      size: ring.size,
      fill: emblemColour(t),
      opacity: ring.fade,
      t,
      ring: ringIndex,
    };
  }),
);
