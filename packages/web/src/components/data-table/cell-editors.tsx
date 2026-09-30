"use client";

import { Check } from "lucide-react";
import { type KeyboardEvent, type ReactElement, useState } from "react";
import { cn } from "../../lib/cn";
import { Badge, type TagHue } from "../badge";
import { Icon } from "../icon";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";

/*
 * Inline cell editors shared by DataTable's in-cell edit and ContentTableEditor. They know nothing about either
 * component's column type: they only need the editor kind and, for choices, the options.
 */

const HUES = ["gray", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"];
export const hueOf = (h?: string): TagHue => (HUES.includes(h ?? "") ? (h as TagHue) : "gray");

export interface CellEditorOption {
  value: string;
  label: string;
  /** A badge hue from the Nasaq tag palette: gray, red, orange, amber, green, teal, blue, violet, pink. */
  hue?: string;
}

export interface CellEditorColumn {
  /** `number`, `date` and `url` change the input; anything else edits as text. */
  type: string;
  /** Accessible name of the option list. */
  label?: string;
  options?: CellEditorOption[];
}

export type CellEditMove = "down" | "right" | "left" | "none";

export interface TextEditorProps {
  column: Pick<CellEditorColumn, "type">;
  initial: string;
  /** Return `false` to keep editing (a validation error): the input stays open and focused. */
  onCommit: (raw: string, move: CellEditMove) => boolean | void;
  onCancel: () => void;
  ariaLabel: string;
  /** The edit began by typing a character: keep the caret after it instead of selecting it. */
  seeded?: boolean;
  /** Marks the input invalid. Show the message yourself next to it. */
  invalid?: boolean;
  /** Id of the element that describes the error. */
  describedBy?: string;
}

/** The inline input for text, number, date and link cells. Enter and Tab commit, Escape cancels, leaving commits. */
export function TextEditor({ column, initial, onCommit, onCancel, ariaLabel, seeded, invalid, describedBy }: TextEditorProps) {
  const [draft, setDraft] = useState(initial);
  const [done, setDone] = useState(false);
  const finish = (move: CellEditMove) => {
    if (done) return;
    setDone(true);
    if (onCommit(draft, move) === false) setDone(false);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      finish("down");
    } else if (e.key === "Tab") {
      e.preventDefault();
      finish(e.shiftKey ? "left" : "right");
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDone(true);
      onCancel();
    }
  };
  const numeric = column.type === "number";
  return (
    <input
      autoFocus
      value={draft}
      type={column.type === "date" ? "date" : "text"}
      inputMode={numeric ? "decimal" : column.type === "url" ? "url" : undefined}
      dir={numeric || column.type === "url" || column.type === "date" ? "ltr" : "auto"}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onKeyDown={onKeyDown}
      onBlur={() => finish("none")}
      onFocus={(e) => {
        if (column.type === "date") return;
        if (seeded) e.currentTarget.setSelectionRange(initial.length, initial.length);
        else e.currentTarget.select();
      }}
      className={cn(
        "absolute inset-0 size-full min-w-0 bg-card px-3 text-body-sm text-foreground outline-2 -outline-offset-2",
        invalid ? "outline-nq-danger-text" : "outline-nq-focus",
        numeric && "text-end",
        (column.type === "url" || column.type === "date") && "text-start",
      )}
    />
  );
}

export interface ChoiceEditorLabels {
  noOptions: string;
  clear: string;
}

export interface ChoiceEditorProps {
  column: Pick<CellEditorColumn, "type" | "label" | "options">;
  value: string | string[] | number | boolean | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: string | string[] | null) => void;
  labels: ChoiceEditorLabels;
  /** Show the "Clear" row. Default true. Turn it off for a required choice. */
  clearable?: boolean;
  children: ReactElement;
}

const isEmptyValue = (v: unknown) => v == null || v === "" || (Array.isArray(v) && v.length === 0);

/** The option list for select and tags cells, in a popover anchored to the cell content. */
export function ChoiceEditor({ column, value, open, onOpenChange, onChange, labels, clearable = true, children }: ChoiceEditorProps) {
  const multi = column.type === "tags";
  const chosen = multi ? (Array.isArray(value) ? value : []) : [value];
  const options = column.options ?? [];
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger nativeButton={false} render={children} />
      <PopoverContent align="start" className="w-56 p-1">
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-caption text-muted-foreground">{labels.noOptions}</p>
        ) : (
          <ul role="listbox" aria-label={column.label} aria-multiselectable={multi || undefined} className="flex max-h-60 flex-col overflow-y-auto">
            {options.map((o) => {
              const on = chosen.includes(o.value);
              return (
                <li key={o.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    autoFocus={on || undefined}
                    onClick={() => {
                      if (multi) onChange(on ? (chosen as string[]).filter((v) => v !== o.value) : [...(chosen as string[]), o.value]);
                      else {
                        onChange(o.value);
                        onOpenChange(false);
                      }
                    }}
                    className="flex h-control-sm w-full items-center gap-2 rounded-[4px] px-2 text-start outline-none hover:bg-nq-hover focus-visible:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center">{on ? <Icon icon={Check} className="size-4" /> : null}</span>
                    <Badge variant="tag" hue={hueOf(o.hue)}>
                      {o.label}
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {clearable && !isEmptyValue(value) ? (
          <button
            type="button"
            onClick={() => {
              onChange(multi ? [] : null);
              onOpenChange(false);
            }}
            className="mt-1 flex h-control-sm w-full items-center rounded-[4px] border-t border-border px-2 text-caption text-muted-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
          >
            {labels.clear}
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
