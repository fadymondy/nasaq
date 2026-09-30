"use client";

import { CircleAlert, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../button";
import { CodeBlock } from "../code-block";
import { Field, FieldDescription, FieldLabel, Input } from "../field";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { StatusGlyph } from "./status-glyph";
import { WorkflowFieldEditor } from "./field-editor";
import { type WorkflowCanvasLabels, useCanvasLabels } from "./canvas-labels";
import { PanelHeader } from "./node-picker";
import type { WorkflowIssue, WorkflowNodeData, WorkflowNodeRun, WorkflowStepType } from "./workflow-model";

export interface WorkflowConfigPanelProps {
  node: WorkflowNodeData;
  /** The step type of the node. `undefined` when it is not installed. */
  type?: WorkflowStepType;
  issues?: WorkflowIssue[];
  /** How this node ran in the execution being shown. Adds an Output tab. */
  run?: WorkflowNodeRun;
  readOnly?: boolean;
  onChange: (patch: { label?: string; config?: Record<string, unknown> }) => void;
  onRemove?: () => void;
  onAddNext?: () => void;
  onClose: () => void;
  labels?: Partial<WorkflowCanvasLabels>;
  formatDuration?: (ms: number) => string;
}

/**
 * The side panel for one node: its name and a form built from the step type's fields, plus an Output tab
 * (status, duration, items, error, JSON) when an execution is being shown.
 */
export function WorkflowConfigPanel({ node, type, issues = [], run, readOnly, onChange, onRemove, onAddNext, onClose, labels, formatDuration }: WorkflowConfigPanelProps) {
  const { t } = useCanvasLabels(labels);
  const Icon = type?.icon ?? CircleAlert;
  const [tab, setTab] = useState<"settings" | "output">(run ? "output" : "settings");
  const missing = new Set(issues.filter((i) => i.code === "missing-field").map((i) => i.field));
  const title = node.label?.trim() || type?.label || t.unknownType;
  const setField = (name: string, v: unknown) => onChange({ config: { ...node.config, [name]: v } });

  const settings = (
    <div className="flex flex-col gap-4 p-4">
      <Field disabled={readOnly}>
        <FieldLabel>{t.name}</FieldLabel>
        <Input value={node.label ?? ""} placeholder={type?.label} onChange={(e) => onChange({ label: e.target.value })} />
        <FieldDescription>{t.nameHelp}</FieldDescription>
      </Field>
      {type && (type.fields?.length ?? 0) === 0 ? <p className="text-body-sm text-muted-foreground">{t.noFields}</p> : null}
      {(type?.fields ?? []).map((f) => (
        <WorkflowFieldEditor key={f.name} def={f} value={node.config[f.name]} onChange={(v) => setField(f.name, v)} disabled={readOnly} invalid={missing.has(f.name)} requiredLabel={t.required} />
      ))}
      {issues
        .filter((i) => i.code !== "missing-field")
        .map((i) => (
          <p key={i.code} className="flex items-start gap-2 text-body-sm text-nq-warning-text">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t.issue[i.code](title, "")}
          </p>
        ))}
    </div>
  );

  const output = run ? (
    <div className="flex flex-col gap-3 p-4">
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-body-sm">
        <dt className="text-muted-foreground">{t.runStatus}</dt>
        <dd className="flex items-center gap-1.5">
          <StatusGlyph status={run.status} />
          {t.status[run.status]}
        </dd>
        {run.durationMs !== undefined ? (
          <>
            <dt className="text-muted-foreground">{t.duration}</dt>
            <dd>
              <bdi>{formatDuration ? formatDuration(run.durationMs) : `${run.durationMs} ms`}</bdi>
            </dd>
          </>
        ) : null}
        {run.items !== undefined ? (
          <>
            <dt className="text-muted-foreground">{t.items}</dt>
            <dd>
              <bdi>{run.items}</bdi>
            </dd>
          </>
        ) : null}
      </dl>
      {run.error ? (
        <div role="alert" className="rounded-control border border-nq-danger/40 bg-nq-danger-soft p-3 text-body-sm text-nq-danger-text">
          <p className="font-medium">{t.errorLabel}</p>
          <p dir="auto">{run.error}</p>
        </div>
      ) : null}
      {run.output !== undefined ? <CodeBlock code={JSON.stringify(run.output, null, 2)} language="json" label={t.output} preClassName="max-h-72" /> : null}
    </div>
  ) : (
    <p className="p-4 text-body-sm text-muted-foreground">{t.noOutput}</p>
  );

  return (
    <div data-slot="workflow-config-panel" className="flex h-full min-h-0 flex-col">
      <PanelHeader icon={<Icon aria-hidden />} title={title} hint={type?.description} onClose={onClose} closeLabel={t.close} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as "settings" | "output")} className="min-h-0 flex-1 gap-0">
        <TabsList variant="underline" className="px-4">
          <TabsTab value="settings">{t.settings}</TabsTab>
          <TabsTab value="output">{t.output}</TabsTab>
        </TabsList>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TabsPanel value="settings">{settings}</TabsPanel>
          <TabsPanel value="output">{output}</TabsPanel>
        </div>
      </Tabs>
      {!readOnly && (onAddNext || onRemove) ? (
        <div className="flex items-center gap-2 border-t border-border px-4 py-3">
          {onAddNext ? (
            <Button variant="secondary" size="sm" onClick={onAddNext}>
              <Plus aria-hidden />
              {t.addNext}
            </Button>
          ) : null}
          {onRemove ? (
            <Button variant="ghost" size="sm" className="ms-auto text-nq-danger-text" onClick={onRemove}>
              <Trash2 aria-hidden />
              {t.remove}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
