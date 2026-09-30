"use client";

import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Switch } from "../switch";
import type { WorkflowFieldDef } from "./workflow-model";

/** One config field, drawn from its definition. */
export function WorkflowFieldEditor({ def, value, onChange, disabled, invalid, requiredLabel }: { def: WorkflowFieldDef; value: unknown; onChange: (next: unknown) => void; disabled?: boolean; invalid?: boolean; requiredLabel: string }) {
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const ltr = def.kind === "url" || def.kind === "code" || def.kind === "number";
  if (def.kind === "boolean") {
    return (
      <Field className="flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <FieldLabel>{def.label}</FieldLabel>
          {def.help ? <FieldDescription>{def.help}</FieldDescription> : null}
        </div>
        <Switch checked={Boolean(value)} onCheckedChange={(v) => onChange(v)} disabled={disabled} aria-label={def.label} />
      </Field>
    );
  }
  return (
    <Field invalid={invalid} disabled={disabled}>
      <FieldLabel>
        {def.label}
        {def.required ? <span aria-hidden className="ms-1 text-nq-danger-text">*</span> : null}
      </FieldLabel>
      {def.kind === "select" ? (
        <Select value={text || null} onValueChange={(v) => onChange(v)} items={def.options ?? []} disabled={disabled}>
          <SelectTrigger aria-label={def.label}>
            <SelectValue placeholder={def.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {(def.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : def.kind === "textarea" || def.kind === "code" ? (
        <Textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          rows={def.kind === "code" ? 5 : 3}
          {...(def.kind === "code" ? { dir: "ltr", spellCheck: false, className: "font-mono text-caption" } : {})}
        />
      ) : (
        <Input
          type={def.kind === "number" ? "number" : "text"}
          inputMode={def.kind === "number" ? "decimal" : def.kind === "url" ? "url" : undefined}
          value={text}
          ltr={ltr}
          placeholder={def.placeholder}
          onChange={(e) => onChange(def.kind === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
        />
      )}
      {def.help ? <FieldDescription>{def.help}</FieldDescription> : null}
      {invalid ? <FieldError match>{requiredLabel}</FieldError> : null}
    </Field>
  );
}
