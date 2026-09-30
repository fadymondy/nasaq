"use client";

import { Search, X } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { normalizeForSearch } from "../commands";
import { Button } from "../button";
import { Input } from "../field";
import { type WorkflowCanvasLabels, useCanvasLabels } from "./canvas-labels";
import type { WorkflowStepType } from "./workflow-model";

/** The title row every canvas side panel shares. */
export function PanelHeader({ icon, title, hint, onClose, closeLabel }: { icon?: ReactNode; title: ReactNode; hint?: ReactNode; onClose: () => void; closeLabel: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-border px-4 py-3">
      {icon ? <span className="flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary [&_svg]:size-4">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <h2 className="text-label text-foreground">{title}</h2>
        {hint ? <p className="text-caption text-muted-foreground">{hint}</p> : null}
      </div>
      <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={closeLabel} title={closeLabel}>
        <X aria-hidden />
      </Button>
    </div>
  );
}

export interface WorkflowNodePickerProps {
  /** The steps to offer. The canvas passes triggers when the graph has none, actions otherwise. */
  types: WorkflowStepType[];
  /** Group headings: `{ id, label }` in display order. A category with no entry shows its id. */
  categories?: { id: string; label: string }[];
  /** The name of the node the step will follow. Omit when starting a workflow. */
  afterName?: string;
  onPick: (type: WorkflowStepType) => void;
  onClose: () => void;
  labels?: Partial<WorkflowCanvasLabels>;
  className?: string;
}

/**
 * "What happens next?": every step grouped by category and searchable by name, description or keyword.
 * Arrow keys move through the matches and Enter adds the highlighted one, so a workflow can be built
 * without leaving the keyboard.
 */
export function WorkflowNodePicker({ types, categories, afterName, onPick, onClose, labels, className }: WorkflowNodePickerProps) {
  const { t } = useCanvasLabels(labels);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  const groups = useMemo(() => {
    const needle = normalizeForSearch(q.trim());
    const order = categories?.map((c) => c.id) ?? [];
    const ids = [...new Set([...order, ...types.map((s) => s.category)])];
    return ids
      .map((id) => ({
        id,
        label: categories?.find((c) => c.id === id)?.label ?? id,
        steps: types.filter((s) => s.category === id && (!needle || normalizeForSearch([s.label, s.description ?? "", s.id, ...(s.keywords ?? [])].join(" ")).includes(needle))),
      }))
      .filter((g) => g.steps.length > 0);
  }, [q, types, categories]);
  const flat = groups.flatMap((g) => g.steps);
  const current = flat[Math.min(active, flat.length - 1)];

  return (
    <div data-slot="workflow-node-picker" className={cn("flex h-full min-h-0 flex-col", className)} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <PanelHeader title={t.pickerTitle} hint={afterName ? t.pickerAfter(afterName) : t.pickerStart} onClose={onClose} closeLabel={t.close} />
      <div className="relative border-b border-border px-4 py-3">
        <Search aria-hidden className="pointer-events-none absolute start-7 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, flat.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && current) {
              e.preventDefault();
              onPick(current);
            }
          }}
          className="ps-9"
          placeholder={t.pickerSearch}
          aria-label={t.pickerSearch}
          role="combobox"
          aria-expanded="true"
          aria-controls="nq-picker-list"
          aria-activedescendant={current ? `nq-pick-${current.id}` : undefined}
        />
      </div>
      <div id="nq-picker-list" role="listbox" aria-label={t.pickerTitle} className="min-h-0 flex-1 overflow-y-auto py-2">
        {groups.length === 0 ? <p className="px-4 py-6 text-center text-body-sm text-muted-foreground">{t.pickerNone(q)}</p> : null}
        {groups.map((g) => (
          <div key={g.id} role="group" aria-label={g.label} className="pb-2">
            <p className="eyebrow px-4 pb-1 pt-2">{g.label}</p>
            {g.steps.map((s) => {
              const Icon = s.icon;
              const on = s.id === current?.id;
              return (
                <button
                  key={s.id}
                  id={`nq-pick-${s.id}`}
                  type="button"
                  role="option"
                  aria-selected={on}
                  tabIndex={-1}
                  data-pick-type={s.id}
                  onMouseEnter={() => setActive(flat.indexOf(s))}
                  onClick={() => onPick(s)}
                  className={cn("flex w-full items-start gap-3 px-4 py-2.5 text-start transition-colors", on ? "bg-nq-hover" : "hover:bg-nq-hover")}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary [&_svg]:size-4">
                    <Icon aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-label text-foreground">{s.label}</span>
                    {s.description ? <span className="block text-caption text-muted-foreground">{s.description}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
