// Cube-lattice mark system, copied verbatim from fadymondy.com-v2 web/lib/brand/marks.ts
// (the source of truth). A cube may only sit where (col + row) is odd, so cubes touch
// only at corners. Radius 0. Never mirrored in RTL, never recoloured, never filtered.
// Keys are Nasaq brand keys; the upstream key is noted where it differs.

export type Cell = readonly [col: number, row: number];

export interface MarkSpec {
  name: string;
  cells: readonly Cell[];
  /** Cells rendered in the accent colour instead of the body colour. */
  accentCells: readonly Cell[];
  body: string;
  accent: string;
  /** Body colour to use when rendered on a dark ground, if different. */
  bodyOnDark?: string;
}

/**
 * The Nasaq mark. PROPOSAL pending Fady's approval (ARCHITECTURE D-6, BRAND-AUDIT §4).
 * An arrow of four cubes, two per arm, with the gold cube at its centre.
 */
export const NASAQ_MARK: MarkSpec = {
  name: "Nasaq",
  cells: [[1, 0], [5, 0], [2, 1], [4, 1], [3, 2]],
  accentCells: [[3, 2]],
  body: "#15694A",
  bodyOnDark: "#4CC495",
  accent: "#C9A227",
};

export const FADY_MONDY_MARK: MarkSpec = {
  name: "Fady Mondy",
  cells: [[1, 0], [3, 0], [0, 1], [2, 1], [1, 2], [3, 2], [0, 3], [2, 3]],
  accentCells: [[3, 0]],
  body: "#0E1A3C",
  bodyOnDark: "#F0EBE1",
  accent: "#C9A227",
};

export const MARKS = {
  nasaq: NASAQ_MARK,
  fadymondy: FADY_MONDY_MARK,
  /** upstream: managy */
  mahaam: {
    name: "Mahaam",
    cells: [[1, 0], [3, 0], [0, 1], [2, 1]],
    accentCells: [[3, 0]],
    body: "#8C3FB5",
    accent: "#C9A227",
  },
  /** upstream: cabrain */
  zekra: {
    name: "Zekra",
    cells: [[3, 0], [2, 1], [4, 1], [1, 2], [3, 2], [5, 2], [2, 3], [4, 3]],
    accentCells: [[3, 0]],
    body: "#6D4DE6",
    accent: "#C9A227",
  },
  /** upstream: claude-digital-twin */
  moharrik: {
    name: "Moharrik",
    cells: [[1, 0], [3, 0], [0, 1], [4, 1], [1, 2], [3, 2], [2, 3]],
    accentCells: [[3, 0]],
    body: "#00A0A8",
    accent: "#C9A227",
  },
  /** upstream: booki */
  seatfor: {
    name: "SeatFor",
    cells: [[1, 0], [3, 0], [5, 0], [2, 1], [4, 1], [1, 2], [3, 2], [5, 2]],
    accentCells: [[4, 1]],
    body: "#B8479B",
    accent: "#C9A227",
  },
  "health-debug": {
    name: "Health Debug",
    cells: [[1, 0], [3, 0], [0, 1], [2, 1], [4, 1], [1, 2], [3, 2], [2, 3]],
    accentCells: [[3, 0]],
    body: "#B0243F",
    accent: "#C9A227",
  },
  circlexo: {
    name: "CircleXO",
    cells: [[3, 0], [2, 1], [4, 1], [1, 2], [5, 2], [2, 3], [4, 3], [3, 4]],
    accentCells: [[3, 0]],
    body: "#6FA8D6",
    accent: "#C9A227",
  },
  /** upstream: cloudy */
  hosbah: {
    name: "Hosbah",
    cells: [[1, 0], [3, 0], [2, 1], [1, 2], [3, 2], [2, 3], [1, 4], [3, 4]],
    accentCells: [[3, 0]],
    body: "#2E6F9E",
    accent: "#C9A227",
  },
  /** CircleXO product, matjar.circlexo.com */
  matjar: {
    name: "Matjar",
    cells: [[3, 0], [0, 1], [2, 1], [4, 1], [6, 1], [1, 2], [3, 2], [5, 2], [2, 3], [4, 3]],
    accentCells: [[3, 0]],
    body: "#0E7C66",
    bodyOnDark: "#2FCB9F",
    accent: "#C9A227",
  },
  /** CircleXO product, sanduq.circlexo.com */
  sanduq: {
    name: "Sanduq",
    cells: [[1, 0], [3, 0], [0, 1], [2, 1], [4, 1], [1, 2], [3, 2]],
    accentCells: [[2, 1]],
    body: "#B7791F",
    bodyOnDark: "#E9B44C",
    accent: "#0E1A3C",
  },
  /** CircleXO product, mizan.circlexo.com */
  mizan: {
    name: "Mizan",
    cells: [[3, 0], [2, 1], [4, 1], [1, 2], [3, 2], [5, 2], [0, 3], [6, 3]],
    accentCells: [[3, 0]],
    body: "#1E3A5F",
    bodyOnDark: "#7FA7D9",
    accent: "#C9A227",
  },
  /** CircleXO product, qaima.circlexo.com */
  qaima: {
    name: "Qaima",
    cells: [[1, 0], [5, 0], [0, 1], [2, 1], [4, 1], [6, 1], [1, 2], [3, 2], [5, 2]],
    accentCells: [[3, 2]],
    body: "#B5400F",
    bodyOnDark: "#F0A062",
    accent: "#C9A227",
  },
  /** CircleXO product, makhzan.circlexo.com */
  makhzan: {
    name: "Makhzan",
    cells: [[3, 0], [2, 1], [4, 1], [1, 2], [3, 2], [5, 2], [0, 3], [2, 3], [4, 3], [6, 3]],
    accentCells: [[3, 0]],
    body: "#8D6E3F",
    bodyOnDark: "#D2B48C",
    accent: "#C9A227",
  },
  /** CircleXO product, mawared.circlexo.com */
  mawared: {
    name: "Mawared",
    cells: [[1, 0], [5, 0], [0, 1], [2, 1], [4, 1], [6, 1], [3, 2]],
    accentCells: [[3, 2]],
    body: "#A23B72",
    bodyOnDark: "#E07AAE",
    accent: "#C9A227",
  },
  /** upstream: orchestra-mcp */
  orchestra: {
    name: "Orchestra",
    cells: [[3, 2], [4, 3], [5, 2], [6, 1]],
    accentCells: [[6, 1]],
    body: "#D97757",
    accent: "#8C3B1F",
  },
  /** to-go.dev/brand: the ToGO framework */
  togo: {
    name: "ToGO",
    cells: [[0, 1], [1, 0], [1, 2], [2, 1], [2, 3], [3, 2]],
    accentCells: [[2, 1], [2, 3], [3, 2]],
    body: "#0E1A3C",
    bodyOnDark: "#F0EBE1",
    accent: "#1F8A99",
  },
} as const satisfies Record<string, MarkSpec>;

/** Legacy / upstream keys that resolve to a Nasaq brand key. */
export const BRAND_ALIASES: Record<string, keyof typeof MARKS> = {
  managy: "mahaam",
  cabrain: "zekra",
  "claude-digital-twin": "moharrik",
  booki: "seatfor",
  cloudy: "hosbah",
  "orchestra-mcp": "orchestra",
  "fady-mondy": "fadymondy",
  "togo-framework": "togo",
};
