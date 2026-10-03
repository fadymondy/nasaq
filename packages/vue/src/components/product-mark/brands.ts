// The brand registry (marks, geometry, names) lives in packages/brands, shared with React and Blade.
// The build rewrites "@nasaq/brands" to "@fadymondy/nasaq/brands" (see tsdown.config.ts).
export { BRANDS, resolveBrand, markGeometry, type BrandManifest, type MarkSpec } from "@nasaq/brands";

/** Below this size (px) the mark drops its accent, as in React. */
export const MARK_ACCENT_MIN_SIZE = 20;
