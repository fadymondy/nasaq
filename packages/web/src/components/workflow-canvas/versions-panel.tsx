"use client";

import { History } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/cn";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { DateTime, useFormatNumber } from "../numeric";
import { type WorkflowCanvasLabels, useCanvasLabels } from "./canvas-labels";
import { PanelHeader } from "./node-picker";
import type { WorkflowVersion } from "./workflow-model";

export interface WorkflowVersionsPanelProps {
  versions: WorkflowVersion[];
  /** The version the workflow is at now. */
  currentVersion: number;
  /** The version drawn on the canvas read-only, if any. */
  previewing?: number | null;
  /** True while there are unsaved edits, so restoring says what will happen to them. */
  canRestore?: boolean;
  onPreview: (version: WorkflowVersion | null) => void;
  /** Restore is itself a new version. Return `{ error }` to keep the dialog's result visible. */
  onRestore?: (version: WorkflowVersion) => Promise<void | { error?: string }>;
  onClose: () => void;
  labels?: Partial<WorkflowCanvasLabels>;
}

/**
 * Every save, newest first. Choosing one draws it on the canvas, read-only, beside the list, so "what did
 * version 3 look like" is answered by looking; it can then be restored (with a confirmation).
 */
export function WorkflowVersionsPanel({ versions, currentVersion, previewing, canRestore = true, onPreview, onRestore, onClose, labels }: WorkflowVersionsPanelProps) {
  const { t } = useCanvasLabels(labels);
  const [confirm, setConfirm] = useState<WorkflowVersion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  const formatNumber = useFormatNumber();
  const fmt = (n: number) => formatNumber(n);

  async function restore(v: WorkflowVersion) {
    if (!onRestore) return;
    setBusy(true);
    setError(null);
    const res = await onRestore(v);
    setBusy(false);
    if (res && res.error) setError(res.error);
    else onPreview(null);
  }

  return (
    <div data-slot="workflow-versions-panel" className="flex h-full min-h-0 flex-col">
      <PanelHeader icon={<History aria-hidden />} title={t.versionsTitle} hint={t.versionsHint} onClose={onClose} closeLabel={t.close} />
      {error ? (
        <p role="alert" className="border-b border-border bg-nq-danger-soft px-4 py-2 text-body-sm text-nq-danger-text">
          {error}
        </p>
      ) : null}
      <ol className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {sorted.map((v) => {
          const current = v.version === currentVersion;
          const on = previewing === v.version;
          return (
            <li key={v.version} data-version-row={v.version} className={cn("px-4 py-3", on && "bg-nq-selected")}>
              <button type="button" aria-pressed={on} onClick={() => onPreview(current || on ? null : v)} className="block w-full text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-label text-foreground">{t.versionLabel(fmt(v.version))}</span>
                  {current ? <Badge variant="success">{t.current}</Badge> : null}
                  {on ? <Badge variant="info">{t.preview}</Badge> : null}
                </span>
                <span className="block text-caption text-muted-foreground">
                  <DateTime value={v.savedAt} format={{ dateStyle: "medium", timeStyle: "short" }} />
                  {v.author ? <> · {t.by(v.author)}</> : null}
                </span>
                {v.note ? <span className="mt-1 block text-body-sm text-foreground">{v.note}</span> : null}
              </button>
              {!current && onRestore && canRestore ? (
                <Button variant="secondary" size="sm" className="mt-2" onClick={() => setConfirm(v)}>
                  {t.restore}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ol>
      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm ? t.restoreTitle(fmt(confirm.version)) : ""}</AlertDialogTitle>
            <AlertDialogDescription>{t.restoreBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="primary" disabled={busy} onClick={() => confirm && void restore(confirm)}>
              {busy ? t.restoring : t.restore}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
