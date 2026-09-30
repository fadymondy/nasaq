"use client";

import { EyeOff, ListChecks, Play, Square } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import { DateTime } from "../numeric";
import { EmptyState } from "../states";
import { StatusGlyph } from "./status-glyph";
import { type WorkflowCanvasLabels, useCanvasLabels } from "./canvas-labels";
import { PanelHeader } from "./node-picker";
import type { WorkflowRun } from "./workflow-model";

export interface WorkflowRunsPanelProps {
  runs: WorkflowRun[];
  /** The execution drawn on the canvas, if any. */
  selectedId?: string | null;
  onSelect: (id: string | null) => void;
  /** Whether a replay is playing, and its controls. Omit `onReplay` to hide the button. */
  replaying?: boolean;
  onReplay?: () => void;
  onStopReplay?: () => void;
  onClose: () => void;
  formatDuration: (ms: number) => string;
  labels?: Partial<WorkflowCanvasLabels>;
}

/** The executions list: newest first, pick one to draw it on the canvas as it ran, and replay it step by step. */
export function WorkflowRunsPanel({ runs, selectedId, onSelect, replaying, onReplay, onStopReplay, onClose, formatDuration, labels }: WorkflowRunsPanelProps) {
  const { t } = useCanvasLabels(labels);
  const sorted = [...runs].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  return (
    <div data-slot="workflow-runs-panel" className="flex h-full min-h-0 flex-col">
      <PanelHeader icon={<ListChecks aria-hidden />} title={t.runsTitle} hint={t.runsHint} onClose={onClose} closeLabel={t.close} />
      {selectedId ? (
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          {onReplay ? (
            <Button variant="secondary" size="sm" onClick={replaying ? onStopReplay : onReplay}>
              {replaying ? <Square aria-hidden /> : <Play aria-hidden />}
              {replaying ? t.stopReplay : t.replay}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
            <EyeOff aria-hidden />
            {t.clearOverlay}
          </Button>
        </div>
      ) : null}
      {sorted.length === 0 ? (
        <div className="p-4">
          <EmptyState title={t.runsNone} />
        </div>
      ) : (
        <ol className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {sorted.map((r) => {
            const on = r.id === selectedId;
            return (
              <li key={r.id} data-run-row={r.id} className={cn(on && "bg-nq-selected")}>
                <button type="button" aria-pressed={on} onClick={() => onSelect(on ? null : r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                  <StatusGlyph status={r.status} label={t.status[r.status]} className="size-5" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-label text-foreground">{t.status[r.status]}</span>
                    <span className="block truncate text-caption text-muted-foreground">
                      <DateTime value={r.startedAt} relative />
                      {r.trigger ? <> · {r.trigger}</> : null}
                    </span>
                  </span>
                  {r.durationMs !== undefined ? (
                    <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
                      <bdi>{formatDuration(r.durationMs)}</bdi>
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
