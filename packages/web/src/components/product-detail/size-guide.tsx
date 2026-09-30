"use client";

import { Ruler } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../dialog";
import { type ProductDetailLabels, usePdpStrings } from "./pdp-strings";

export interface ProductSizeGuideData {
  /** Dialog title. Default "Size guide". */
  title?: string;
  description?: string;
  /** Column headings; the first column names the size. */
  columns: readonly string[];
  /** One row per size. Cells stay left-to-right so measurements like "38-40" read correctly in Arabic. */
  rows: readonly (readonly (string | number)[])[];
  /** Size the shopper has selected; its row is highlighted. Matches the first cell. */
  highlight?: string;
  /** How to measure, fit advice, unit switch… */
  footer?: ReactNode;
}

export interface ProductSizeGuideProps {
  guide: ProductSizeGuideData;
  /** Highlight this size's row (the first cell). Overrides `guide.highlight`. */
  selectedSize?: string;
  className?: string;
  labels?: ProductDetailLabels;
}

/** A "Size guide" link that opens a dialog with the measurement table. */
export function ProductSizeGuide({ guide, selectedSize, className, labels }: ProductSizeGuideProps) {
  const { t } = usePdpStrings(labels);
  const highlight = selectedSize ?? guide.highlight;
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="link" size="sm" className={cn("gap-1 text-caption", className)} />}>
        <Ruler aria-hidden />
        {t.sizeGuide}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{guide.title ?? t.sizeGuideTitle}</DialogTitle>
          <DialogDescription>{guide.description ?? t.sizeGuideDescription}</DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto rounded-control border border-border">
          <table className="w-full min-w-max border-collapse text-body-sm">
            <thead className="bg-secondary text-start">
              <tr>
                {guide.columns.map((c, i) => (
                  <th key={i} scope="col" className="px-3 py-2 text-start text-label text-foreground">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guide.rows.map((row, r) => (
                <tr key={r} data-selected={row[0] === highlight || undefined} className="border-t border-border data-selected:bg-nq-selected">
                  {row.map((cell, c) => (
                    <td key={c} className={cn("px-3 py-2 tabular-nums", c === 0 ? "text-label text-foreground" : "text-muted-foreground")}>
                      <bdi>{cell}</bdi>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {guide.footer ? <div className="text-caption text-muted-foreground">{guide.footer}</div> : null}
      </DialogContent>
    </Dialog>
  );
}
