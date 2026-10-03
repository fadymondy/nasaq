import type { ExportColumnSpec, ExportFileFormat } from "./export-formats";

export type ExportFormat = ExportFileFormat | "pdf";
export type ExportScope = "selected" | "filtered" | "all";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExportColumn<T = any> = ExportColumnSpec<T>;

/** Rows for one scope: an array, or a count plus a loader (for rows that live on the server). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExportScopeSource<T = any> = readonly T[] | { count: number; load: () => readonly T[] | Promise<readonly T[]> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ExportRequest<T = any> {
  format: ExportFormat;
  scope: ExportScope;
  columns: ExportColumn<T>[];
  rows: readonly T[];
  /** The file name with its extension. */
  filename: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ExportFile<T = any> {
  blob: Blob;
  filename: string;
  request: ExportRequest<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExportPdfHandler<T = any> = (request: ExportRequest<T>, control: { signal: AbortSignal; onProgress: (fraction: number) => void }) => Promise<Blob | void>;

export const EXPORT_SCOPES: ExportScope[] = ["selected", "filtered", "all"];

export const sourceCount = (source: ExportScopeSource | undefined) => (source == null ? 0 : "count" in source ? source.count : source.length);

/** Saves a Blob through a temporary link. */
export function saveExportBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
