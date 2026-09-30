"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "../badge";
import { Checkbox } from "../checkbox";
import { Icon } from "../icon";
import { formatDate, formatNumber } from "../numeric";
import { ChoiceEditor as SharedChoiceEditor, hueOf } from "../data-table/cell-editors";
import { type ContentCell, type ContentColumn, isEmpty } from "./content-table-math";
import type { ContentTableText as T } from "./content-table-strings";

export interface CellViewProps {
  column: ContentColumn;
  value: ContentCell | undefined;
  locale: string;
  t: T;
  rowLabel: string;
}

/** What a cell shows when it is not being edited. */
export function CellView({ column, value, locale, t, rowLabel }: CellViewProps) {
  if (column.type === "checkbox") return null;
  if (isEmpty(value)) return <span className="text-muted-foreground/60" aria-hidden>{"—"}</span>;
  switch (column.type) {
    case "number":
      return <span className="block w-full text-end tabular-nums">{formatNumber(Number(value), locale)}</span>;
    case "date":
      return <span>{formatDate(`${String(value)}T00:00:00`, locale)}</span>;
    case "url":
      return (
        <span className="flex min-w-0 items-center gap-1.5">
          <bdi dir="ltr" className="min-w-0 truncate text-start underline decoration-nq-line-strong underline-offset-4">
            {String(value).replace(/^https?:\/\//, "")}
          </bdi>
          {/^https?:\/\//i.test(String(value)) ? (
            <a
              href={String(value)}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={-1}
              aria-label={`${t.open}: ${rowLabel}`}
              className="shrink-0 rounded-[4px] text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Icon icon={ExternalLink} className="size-3.5" />
            </a>
          ) : null}
        </span>
      );
    case "select": {
      const option = column.options?.find((o) => o.value === value);
      return (
        <Badge variant="tag" hue={hueOf(option?.hue)}>
          {option?.label ?? String(value)}
        </Badge>
      );
    }
    case "tags":
      return (
        <span className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden">
          {(value as string[]).map((v) => {
            const option = column.options?.find((o) => o.value === v);
            return (
              <Badge key={v} variant="tag" hue={hueOf(option?.hue)}>
                {option?.label ?? v}
              </Badge>
            );
          })}
        </span>
      );
    default:
      return <span className="block min-w-0 truncate" dir="auto">{String(value)}</span>;
  }
}

export { TextEditor, type TextEditorProps } from "../data-table/cell-editors";

export interface ChoiceEditorProps {
  column: ContentColumn;
  value: ContentCell | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: ContentCell) => void;
  t: T;
  children: React.ReactElement;
}

/** The option list for select and tags cells, in a popover anchored to the cell content. */
export function ChoiceEditor({ t, ...props }: ChoiceEditorProps) {
  return <SharedChoiceEditor {...props} labels={{ noOptions: t.noOptions, clear: t.clear }} />;
}

export function CheckboxCell({ checked, disabled, label, onChange }: { checked: boolean; disabled: boolean; label: string; onChange: (v: boolean) => void }) {
  return <Checkbox checked={checked} disabled={disabled} aria-label={label} onCheckedChange={(v) => onChange(Boolean(v))} />;
}
