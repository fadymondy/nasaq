// Shared types and constants of the order detail and the printable documents.
import type { Restock } from "./order-math";
import type { CommerceOrder, RefundRecord } from "./order-types";

export interface StoreOrderChange {
  order: CommerceOrder;
  refunds: RefundRecord[];
  /** Units going back on the shelf because of a refund or a cancel. Update your stock with this. */
  restock?: Restock[];
}

export interface StoreDocumentSeller {
  name: string;
  /** Address lines, top to bottom. */
  lines?: string[];
  email?: string;
  phone?: string;
  /** Tax registration number, printed on invoices. */
  taxId?: string;
  logo?: string;
}

/**
 * Print rules for the documents. Everything outside `.nq-print-root` is hidden, the sheet loses its frame, each order
 * starts a new page and the layout uses logical properties so Arabic sheets print right to left.
 */
export const STORE_DOCUMENT_PRINT_CSS = `
@page { size: A4; margin: 12mm; }
@media print {
  html, body { background: white !important; }
  body * { visibility: hidden !important; }
  .nq-print-root, .nq-print-root * { visibility: visible !important; }
  .nq-print-root { position: absolute; inset-block-start: 0; inset-inline-start: 0; width: 100%; margin: 0 !important; padding: 0 !important; }
  .nq-print-hide { display: none !important; }
  .nq-print-sheet { border: 0 !important; box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; margin: 0 !important; color: black !important; background: white !important; break-after: page; page-break-after: always; }
  .nq-print-sheet:last-child { break-after: auto; page-break-after: auto; }
  .nq-print-sheet * { color: black !important; border-color: black !important; }
  .nq-print-sheet tr, .nq-print-sheet li { break-inside: avoid; }
}
`;
