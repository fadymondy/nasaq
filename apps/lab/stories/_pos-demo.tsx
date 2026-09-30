/* Shared demo data for the POS register stories. */
import { computeLineItems, type PosParkedSale } from "@nasaq/web";
import { t, VAT_BPS } from "./_v1-demo";

/** Sales already on hold, as a saved list would come back from the server. Open "Parked sales" to resume or discard. */
export const parkedDemo = (ar: boolean): PosParkedSale[] => {
  const line = (id: string, productId: string, name: string, quantity: number, unitPrice: number) => ({ id, productId, name, quantity, unitPrice, taxBps: VAT_BPS });
  const sale = (id: string, at: string, note: string, lines: ReturnType<typeof line>[]): PosParkedSale => {
    return { id, at, cashier: t(ar, "Lina", "لينا"), note, lines, totals: computeLineItems(lines, { defaultTaxBps: VAT_BPS }) };
  };
  return [
    sale("h1", "2026-09-30T09:12:00", t(ar, "Table 4", "طاولة ٤"), [line("l1", "p-flat", t(ar, "Flat white", "فلات وايت"), 2, 1600), line("l2", "p-croissant", t(ar, "Butter croissant", "كرواسون بالزبدة"), 1, 1300)]),
    sale("h2", "2026-09-30T09:40:00", t(ar, "Back in 5 minutes", "سيعود بعد ٥ دقائق"), [line("l3", "p-sandwich", t(ar, "Chicken sandwich", "ساندويتش دجاج"), 1, 2800)]),
    sale("h3", "2026-09-30T10:05:00", "", [line("l4", "p-beans", t(ar, "Coffee beans 250g", "حبوب قهوة ٢٥٠ جم"), 1, 6500), line("l5", "p-water", t(ar, "Water 330ml", "مياه ٣٣٠ مل"), 3, 300)]),
  ];
};
