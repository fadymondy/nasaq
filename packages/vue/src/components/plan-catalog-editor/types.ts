import type { CatalogChange } from "./catalog-math";

export type CatalogApplyResult = void | { error?: string };

/** What a server-side dry run sends back. Without `changes` the editor's own diff is shown. */
export interface CatalogPreviewResult {
  changes?: readonly CatalogChange[];
  warnings?: readonly string[];
  error?: string;
}
