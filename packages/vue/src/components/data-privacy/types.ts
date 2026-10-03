import type { ExportStatus } from "./privacy-rules";

export type PrivacyDate = string | number | Date;

export interface DataExportRequest {
  id: string;
  status: ExportStatus;
  requestedAt: PrivacyDate;
  completedAt?: PrivacyDate | null;
  /** When the download link stops working. */
  expiresAt?: PrivacyDate | null;
  sizeBytes?: number;
  /** 0 to 1 while processing, when known. */
  progress?: number;
}

export type DataExportResult = { request: DataExportRequest; error?: undefined } | { error: string; request?: undefined };

export type CancelDeletionState = "ready" | "cancelled" | "expired" | "invalid";
