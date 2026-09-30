"use client";

import { closestCenter, DndContext, type DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, ChevronUp, ChevronsDownUp, ChevronsUpDown, GripVertical, Plus, Trash2, X } from "lucide-react";
import { createContext, type ReactNode, useContext, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { DatePicker } from "../date-picker";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { Icon } from "../icon";
import { formatNumber } from "../numeric";
import { canAdd, canRemove, fitKeys, insertAt, moveItem, removeAt } from "../repeater/repeater-math";
import { RelationPicker } from "../relation-picker";
import { validateField } from "../schema-repeater/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Switch } from "../switch";
import { TagInput } from "../tag-input";
import { Tooltip } from "../tooltip";
import type { SchemaFormField } from "./schema-fields";
import type { SchemaFormRelationSource } from "./schema-form";
import { schemaPathInside } from "./schema-path";
import {
  type SchemaFormMessages,
  schemaFormItemSummary,
  schemaFormItemTitle,
  schemaFormOrdered,
  schemaFormTreeDefaults,
  schemaFormTreeHasData,
  type SchemaTreeLeaf,
  type SchemaTreeList,
  type SchemaTreeNode,
  type SchemaTreeObject,
  type SchemaTreeState,
} from "./schema-tree";

export const SCHEMA_FORM_STRINGS = {
  en: {
    submit: "Save",
    saving: "Saving…",
    reset: "Reset",
    select: "Select…",
    saved: "Saved.",
    failed: "Could not save.",
    fix: (n: number) => (n === 1 ? "Fix 1 field to continue." : `Fix ${n} fields to continue.`),
    optional: "Optional",
    add: (name: string) => `Add ${name}`,
    remove: (name: string) => `Remove ${name}`,
    moveUp: (name: string) => `Move ${name} up`,
    moveDown: (name: string) => `Move ${name} down`,
    drag: (name: string) => `Drag to reorder ${name}`,
    collapse: (name: string) => `Collapse ${name}`,
    expand: (name: string) => `Expand ${name}`,
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    count: (n: string) => `${n} items`,
    countMax: (n: string, max: string) => `${n} of ${max} items`,
    empty: (name: string) => `No ${name} yet.`,
    minReached: (n: string) => `At least ${n} required.`,
    maxReached: (n: string) => `Limit of ${n} reached.`,
    issues: (n: string) => (n === "1" ? "1 issue" : `${n} issues`),
    removeTitle: (name: string) => `Remove ${name}?`,
    removeBody: "It has data that will be lost.",
    removeConfirm: "Remove",
    cancel: "Cancel",
    unmatched: "The server reported problems that do not belong to a field.",
    goTo: "Fields to fix",
  },
  ar: {
    submit: "حفظ",
    saving: "جارٍ الحفظ…",
    reset: "إعادة ضبط",
    select: "اختر…",
    saved: "تم الحفظ.",
    failed: "تعذر الحفظ.",
    fix: (n: number) => (n === 1 ? "صحّح حقلًا واحدًا للمتابعة." : n === 2 ? "صحّح حقلين للمتابعة." : `صحّح ${n} حقول للمتابعة.`),
    optional: "اختياري",
    add: (name: string) => `إضافة ${name}`,
    remove: (name: string) => `حذف ${name}`,
    moveUp: (name: string) => `نقل ${name} لأعلى`,
    moveDown: (name: string) => `نقل ${name} لأسفل`,
    drag: (name: string) => `اسحب لإعادة ترتيب ${name}`,
    collapse: (name: string) => `طيّ ${name}`,
    expand: (name: string) => `توسيع ${name}`,
    expandAll: "توسيع الكل",
    collapseAll: "طيّ الكل",
    count: (n: string) => `${n} عناصر`,
    countMax: (n: string, max: string) => `${n} من ${max} عناصر`,
    empty: (name: string) => `لا يوجد ${name} بعد.`,
    minReached: (n: string) => `مطلوب ${n} على الأقل.`,
    maxReached: (n: string) => `تم بلوغ الحد الأقصى ${n}.`,
    issues: (n: string) => (n === "1" ? "مشكلة واحدة" : `${n} مشكلات`),
    removeTitle: (name: string) => `حذف ${name}؟`,
    removeBody: "يحتوي على بيانات ستفقد.",
    removeConfirm: "حذف",
    cancel: "إلغاء",
    unmatched: "أبلغ الخادم عن مشكلات لا تخص حقلًا محددًا.",
    goTo: "حقول تحتاج تصحيحًا",
  },
};
export type SchemaFormStrings = (typeof SCHEMA_FORM_STRINGS)["en"];

/** Everything the nodes need from the form. Kept in one place so nested fields do not thread props. */
export interface SchemaFormContext {
  uid: string;
  t: SchemaFormStrings;
  locale: string;
  messages: SchemaFormMessages;
  states: Record<string, SchemaTreeState>;
  /** The message to show under a path, if it is revealed. */
  messageFor: (path: string) => string | undefined;
  /** Number of revealed problems at or inside a path. */
  issueCount: (path: string) => number;
  disabled: boolean;
  relations?: Record<string, SchemaFormRelationSource>;
  showErrors: boolean;
  /** A field or list changed. */
  onChange: (path: string, value: unknown) => void;
  /** A list gained, lost or moved items: its item paths are stale. */
  onStructure: (path: string, value: unknown[]) => void;
  /** Bumped to open the groups that hold these paths. */
  reveal: { token: number; paths: readonly string[] } | null;
}

const Ctx = createContext<SchemaFormContext | null>(null);
export const SchemaFormProvider = Ctx.Provider;
function useForm(): SchemaFormContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Schema form nodes must render inside <SchemaForm>.");
  return ctx;
}

const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dateOf = (iso: unknown): Date | null => {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const child = (path: string, key: string) => (path ? `${path}.${key}` : key);

const requiredMark = (
  <span aria-hidden className="ms-0.5 text-nq-danger-text">
    *
  </span>
);

/* ------------------------------------------------------------------ objects and layout */

function objectHidden(node: SchemaTreeObject, path: string, value: unknown, states: Record<string, SchemaTreeState>): boolean {
  if (states[path]?.visible === false) return true;
  if (node.children.length === 0) return false;
  const source = isRecord(value) ? value : {};
  return node.children.every((c) => {
    const p = child(path, c.key);
    return c.kind === "object" ? objectHidden(c, p, source[c.key], states) : states[p]?.visible === false;
  });
}

/** The children of an object: fields and lists in a grid, then nested objects as fieldsets. */
export function SchemaNodes({ node, value, path, depth }: { node: SchemaTreeObject; value: unknown; path: string; depth: number }) {
  const { states } = useForm();
  const source = isRecord(value) ? value : {};
  const { loose, objects } = schemaFormOrdered(node.children);
  const visibleLoose = loose.filter((c) => states[child(path, c.key)]?.visible !== false);
  return (
    <>
      {visibleLoose.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visibleLoose.map((c) => (
            <SchemaNode key={c.key} node={c} value={source[c.key]} path={child(path, c.key)} />
          ))}
        </div>
      ) : null}
      {objects.map((o) => {
        const p = child(path, o.key);
        if (objectHidden(o, p, source[o.key], states)) return null;
        return <SchemaObject key={o.key} node={o} value={source[o.key]} path={p} depth={depth} />;
      })}
    </>
  );
}

function SchemaNode({ node, value, path }: { node: SchemaTreeNode; value: unknown; path: string }) {
  if (node.kind === "field") return <SchemaLeaf node={node} value={value} path={path} />;
  if (node.kind === "list") return <SchemaList node={node} value={Array.isArray(value) ? value : []} path={path} />;
  return null;
}

/** A nested object: a fieldset with its own title. Deeper levels are indented with a rule. */
function SchemaObject({ node, value, path, depth }: { node: SchemaTreeObject; value: unknown; path: string; depth: number }) {
  const ctx = useForm();
  const message = ctx.messageFor(path);
  return (
    <fieldset data-slot="schema-form-section" data-schema-path={path} disabled={ctx.disabled} className={cn("flex min-w-0 flex-col gap-4 border-0 p-0", depth > 0 && "border-s border-border ps-4")}>
      <legend className={cn("mb-3 w-full pb-2 font-semibold text-foreground", depth === 0 ? "border-b border-border text-h4" : "text-label")}>{node.label}</legend>
      {node.description ? <p className="-mt-2 text-caption text-muted-foreground">{node.description}</p> : null}
      <SchemaNodes node={node} value={value} path={path} depth={depth + 1} />
      {message ? (
        <p role="alert" className="text-caption text-nq-danger-text">
          {message}
        </p>
      ) : null}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ one field */

interface InputProps {
  field: SchemaFormField;
  id: string;
  value: unknown;
  required?: boolean;
  invalid?: boolean;
  ariaLabel?: string;
  onChange: (value: unknown) => void;
}

/** The control of a field, without label or message. */
function LeafInput({ field, id, value, required, invalid, ariaLabel, onChange }: InputProps) {
  const { disabled, relations, t } = useForm();
  const aria = { "aria-label": ariaLabel, "aria-invalid": invalid || undefined };

  if (field.relation) {
    const source = relations?.[field.relation.resource] ?? {};
    return field.relation.multiple ? (
      <RelationPicker {...source} multiple id={id} invalid={invalid} disabled={disabled} aria-label={ariaLabel ?? field.label} value={Array.isArray(value) ? (value as string[]) : []} onValueChange={(next) => onChange(next)} />
    ) : (
      <RelationPicker {...source} id={id} invalid={invalid} disabled={disabled} aria-label={ariaLabel ?? field.label} value={typeof value === "string" && value ? value : null} onValueChange={(next) => onChange(next ?? "")} />
    );
  }

  switch (field.type) {
    case "text": {
      const common = { id, value: typeof value === "string" ? value : "", disabled, placeholder: field.placeholder, required, ...aria, onChange: (e: { currentTarget: { value: string } }) => onChange(e.currentTarget.value) };
      return field.multiline ? <Textarea {...common} dir={field.ltr ? "ltr" : undefined} /> : <Input {...common} type={field.inputType ?? "text"} ltr={field.ltr} />;
    }
    case "number":
      return (
        <div className="relative">
          <Input
            id={id}
            ltr
            type="number"
            inputMode={field.integer ? "numeric" : "decimal"}
            value={typeof value === "number" && Number.isFinite(value) ? String(value) : ""}
            min={field.min}
            max={field.max}
            step={field.step ?? (field.integer ? 1 : "any")}
            placeholder={field.placeholder}
            disabled={disabled}
            required={required}
            {...aria}
            className={field.unit ? "pe-12" : undefined}
            onChange={(e) => onChange(e.currentTarget.value === "" ? null : Number(e.currentTarget.value))}
          />
          {field.unit ? <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-body-sm text-muted-foreground">{field.unit}</span> : null}
        </div>
      );
    case "select":
      return (
        <Select items={field.options.map((o) => ({ value: o.value, label: o.label }))} value={typeof value === "string" ? value : null} disabled={disabled} onValueChange={(next) => onChange(next ?? null)}>
          <SelectTrigger id={id} aria-label={ariaLabel} aria-invalid={invalid || undefined}>
            <SelectValue placeholder={field.placeholder ?? t.select} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "switch":
      return <Switch id={id} checked={value === true} disabled={disabled} aria-label={ariaLabel ?? field.label} onCheckedChange={(next) => onChange(next)} />;
    case "date":
      return <DatePicker id={id} value={dateOf(value)} disabled={disabled} min={dateOf(field.min) ?? undefined} max={dateOf(field.max) ?? undefined} aria-label={ariaLabel ?? field.label} onValueChange={(next) => onChange(next ? isoOf(next) : null)} />;
  }
}

function SchemaLeaf({ node, value, path }: { node: SchemaTreeLeaf; value: unknown; path: string }) {
  const ctx = useForm();
  const { field } = node;
  const id = `${ctx.uid}-${path}`;
  const message = ctx.messageFor(path);
  const required = ctx.states[path]?.required ?? node.required;
  const wide = field.type === "switch" || (field.type === "text" && field.multiline) || field.width !== "half";
  const span = wide ? "sm:col-span-2" : "";
  const error = message ? <FieldError match>{message}</FieldError> : null;
  const description = field.description ? <FieldDescription>{field.description}</FieldDescription> : null;
  const label = (
    <FieldLabel htmlFor={id}>
      {field.label}
      {required ? requiredMark : null}
    </FieldLabel>
  );
  const input = <LeafInput field={field} id={id} value={value} required={required} onChange={(v) => ctx.onChange(path, v)} />;

  if (field.type === "switch" && !field.relation) {
    return (
      <Field data-schema-path={path} invalid={!!message} disabled={ctx.disabled} className={cn(span, "flex-row items-start justify-between gap-4 rounded-control border border-border px-3 py-2.5")}>
        <div className="flex min-w-0 flex-col gap-0.5">
          {label}
          {description}
          {error}
        </div>
        {input}
      </Field>
    );
  }
  return (
    <Field data-schema-path={path} invalid={!!message} disabled={ctx.disabled} className={span}>
      {label}
      {input}
      {description}
      {error}
    </Field>
  );
}

/* ------------------------------------------------------------------ lists */

function SchemaList({ node, value, path }: { node: SchemaTreeList; value: unknown[]; path: string }) {
  if (node.mode === "tags") return <TagsList node={node} value={value} path={path} />;
  if (node.mode === "checkboxes") return <CheckboxList node={node} value={value} path={path} />;
  if (node.mode === "items") return <ItemsList node={node} value={value} path={path} />;
  return <GroupsList node={node} value={value} path={path} />;
}

function ListShell({ node, path, children, className }: { node: SchemaTreeList; path: string; children: ReactNode; className?: string }) {
  const ctx = useForm();
  const message = ctx.messageFor(path);
  const required = ctx.states[path]?.required ?? node.required;
  return (
    <fieldset data-slot="schema-form-list" data-schema-path={path} disabled={ctx.disabled} className={cn("flex min-w-0 flex-col gap-2 border-0 p-0", node.width !== "half" && "sm:col-span-2", className)}>
      <legend className="mb-1 text-label text-foreground">
        {node.label}
        {required ? requiredMark : null}
      </legend>
      {node.description ? <p className="-mt-1 text-caption text-muted-foreground">{node.description}</p> : null}
      {children}
      {message ? (
        <p role="alert" data-slot="schema-form-list-error" className="text-caption text-nq-danger-text">
          {message}
        </p>
      ) : null}
    </fieldset>
  );
}

/** Strings as tags. Each tag is checked as it is added, with the same rules the submit uses. */
function TagsList({ node, value, path }: { node: SchemaTreeList; value: unknown[]; path: string }) {
  const ctx = useForm();
  const id = `${ctx.uid}-${path}`;
  const message = ctx.messageFor(path);
  const required = ctx.states[path]?.required ?? node.required;
  const leaf = node.item as SchemaTreeLeaf;
  const span = node.width === "half" ? "" : "sm:col-span-2";
  return (
    <Field data-schema-path={path} invalid={!!message} disabled={ctx.disabled} className={span}>
      <FieldLabel htmlFor={id}>
        {node.label}
        {required ? requiredMark : null}
      </FieldLabel>
      <TagInput
        value={value.map(String)}
        onValueChange={(next) => ctx.onChange(path, next)}
        maxTags={node.max}
        disabled={ctx.disabled}
        invalid={!!message}
        placeholder={leaf.field.type === "text" ? leaf.field.placeholder : undefined}
        inputProps={{ id, dir: leaf.field.type === "text" && leaf.field.ltr ? "ltr" : undefined }}
        validate={(tag) => validateField({ ...leaf.field, label: node.itemLabel, required: true }, tag, {}, ctx.messages) ?? true}
      />
      {node.description ? <FieldDescription>{node.description}</FieldDescription> : null}
      {message ? <FieldError match>{message}</FieldError> : null}
    </Field>
  );
}

/** An enum with uniqueItems: one checkbox per option. The value keeps the order of the options. */
function CheckboxList({ node, value, path }: { node: SchemaTreeList; value: unknown[]; path: string }) {
  const ctx = useForm();
  const leaf = node.item as SchemaTreeLeaf;
  const options = leaf.field.type === "select" ? leaf.field.options : [];
  const chosen = new Set(value.map(String));
  return (
    <ListShell node={node} path={path}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {options.map((o) => {
          const id = `${ctx.uid}-${path}-${o.value}`;
          return (
            <label key={o.value} htmlFor={id} className="flex min-h-control items-center gap-2 text-body-sm text-foreground">
              <Checkbox
                id={id}
                checked={chosen.has(o.value)}
                disabled={ctx.disabled || (!chosen.has(o.value) && node.max !== undefined && chosen.size >= node.max)}
                onCheckedChange={(next) => {
                  const set = new Set(chosen);
                  if (next) set.add(o.value);
                  else set.delete(o.value);
                  ctx.onChange(path, options.filter((x) => set.has(x.value)).map((x) => x.value));
                }}
              />
              <span className="min-w-0">{o.label}</span>
            </label>
          );
        })}
      </div>
    </ListShell>
  );
}

/** Stable keys for the items of a list, parallel to its values. They make a moved row keep its identity. */
function useItemKeys(count: number) {
  const uid = useId();
  const serial = useRef(0);
  const ref = useRef<string[]>([]);
  const make = () => `${uid}-${serial.current++}`;
  if (ref.current.length !== count) ref.current = fitKeys(ref.current, count, make);
  return { keys: ref.current, make, set: (next: string[]) => (ref.current = next) };
}

/** One input per value, for numbers, dates and enums without uniqueItems. */
function ItemsList({ node, value, path }: { node: SchemaTreeList; value: unknown[]; path: string }) {
  const ctx = useForm();
  const { t, locale } = ctx;
  const leaf = node.item as SchemaTreeLeaf;
  const { keys, make, set } = useItemKeys(value.length);
  const root = useRef<HTMLDivElement>(null);
  const focusKey = useRef<string | null>(null);
  const min = Math.max(node.min ?? 0, (ctx.states[path]?.required ?? node.required) ? 1 : 0);

  useEffect(() => {
    if (!focusKey.current) return;
    const key = focusKey.current;
    focusKey.current = null;
    root.current?.querySelector<HTMLElement>(`[data-item-key="${key}"] :is(input, textarea, button, [role=combobox]):not([disabled])`)?.focus();
  });

  const add = () => {
    if (ctx.disabled || !canAdd(value.length, node.max)) return;
    const key = make();
    focusKey.current = key;
    set(insertAt(keys, value.length, key));
    ctx.onStructure(path, insertAt(value, value.length, schemaFormTreeDefaults(leaf)));
  };
  const remove = (index: number) => {
    if (ctx.disabled || !canRemove(value.length, min)) return;
    set(removeAt(keys, index));
    ctx.onStructure(path, removeAt(value, index));
  };

  return (
    <ListShell node={node} path={path}>
      <div ref={root} className="flex flex-col gap-2">
        {value.map((item, index) => {
          const itemPath = `${path}[${index}]`;
          const key = keys[index] as string;
          const message = ctx.messageFor(itemPath);
          const name = `${node.itemLabel} ${formatNumber(index + 1, locale)}`;
          return (
            <Field key={key} data-item-key={key} data-schema-path={itemPath} invalid={!!message} disabled={ctx.disabled}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <LeafInput field={leaf.field} id={`${ctx.uid}-${itemPath}`} value={item} required invalid={!!message} ariaLabel={name} onChange={(v) => ctx.onChange(itemPath, v)} />
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={t.remove(name)} disabled={ctx.disabled || !canRemove(value.length, min)} onClick={() => remove(index)} className="text-muted-foreground hover:text-nq-danger-text">
                  <Trash2 aria-hidden />
                </Button>
              </div>
              {message ? <FieldError match>{message}</FieldError> : null}
            </Field>
          );
        })}
        <ListFooter node={node} path={path} count={value.length} min={min} onAdd={add} />
      </div>
    </ListShell>
  );
}

function ListFooter({ node, count, min, onAdd }: { node: SchemaTreeList; path: string; count: number; min: number; onAdd: () => void }) {
  const ctx = useForm();
  const { t, locale } = ctx;
  const atMax = !canAdd(count, node.max);
  const limit = atMax && node.max !== undefined ? t.maxReached(formatNumber(node.max, locale)) : min > 0 && count <= min ? t.minReached(formatNumber(min, locale)) : null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="secondary" disabled={ctx.disabled || atMax} onClick={onAdd} data-slot="schema-form-add">
        <Icon icon={Plus} />
        {t.add(node.itemLabel)}
      </Button>
      {limit ? <span className="text-caption text-muted-foreground">{limit}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ groups */

/** Objects in a list: each a collapsible group with add, remove (asks when it has data), up and down, and drag. */
function GroupsList({ node, value, path }: { node: SchemaTreeList; value: unknown[]; path: string }) {
  const ctx = useForm();
  const { t, locale } = ctx;
  const item = node.item as SchemaTreeObject;
  const count = value.length;
  const { keys, make, set } = useItemKeys(count);
  const min = Math.max(node.min ?? 0, (ctx.states[path]?.required ?? node.required) ? 1 : 0);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [pending, setPending] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const focusAfter = useRef<{ kind: "item"; key: string } | { kind: "add" } | null>(null);
  const n = (v: number) => formatNumber(v, locale);

  // Open the groups that hold a path someone is going to (a failed submit, a link in the summary).
  const reveal = ctx.reveal;
  useEffect(() => {
    if (!reveal) return;
    const open: string[] = [];
    for (const p of reveal.paths) {
      if (!p.startsWith(`${path}[`)) continue;
      const match = /^\[(\d+)\]/.exec(p.slice(path.length));
      const key = match ? keys[Number(match[1])] : undefined;
      if (key) open.push(key);
    }
    if (open.length) setCollapsed((cur) => (open.some((k) => cur.has(k)) ? new Set([...cur].filter((k) => !open.includes(k))) : cur));
    // Only a new reveal token means something.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal?.token]);

  useEffect(() => {
    const target = focusAfter.current;
    if (!target) return;
    focusAfter.current = null;
    const scope = root.current;
    if (!scope) return;
    if (target.kind === "add") scope.querySelector<HTMLElement>("[data-slot=schema-form-add]")?.focus();
    else scope.querySelector<HTMLElement>(`[data-item-key="${target.key}"] [data-slot=schema-form-group-body] :is(input, textarea, button, [role=combobox]):not([disabled])`)?.focus();
  });

  const titleOf = (index: number) => schemaFormItemTitle(node, value[index], index, n);

  const add = () => {
    if (ctx.disabled || !canAdd(count, node.max)) return;
    const key = make();
    focusAfter.current = { kind: "item", key };
    set(insertAt(keys, count, key));
    ctx.onStructure(path, insertAt(value, count, schemaFormTreeDefaults(item)));
  };
  const remove = (index: number) => {
    if (ctx.disabled || !canRemove(count, min)) return;
    focusAfter.current = { kind: "add" };
    set(removeAt(keys, index));
    ctx.onStructure(path, removeAt(value, index));
  };
  const move = (from: number, to: number) => {
    const target = Math.max(0, Math.min(count - 1, to));
    if (ctx.disabled || target === from) return;
    const key = keys[from] as string;
    set(moveItem(keys, from, target));
    ctx.onStructure(path, moveItem(value, from, target));
    // A moved row can be re-inserted, which drops focus: put it back on the same kind of button.
    requestAnimationFrame(() => {
      const row = root.current?.querySelector<HTMLElement>(`[data-item-key="${key}"]`);
      const same = row?.querySelector<HTMLButtonElement>(`[data-action="${to < from ? "up" : "down"}"]`);
      const other = row?.querySelector<HTMLButtonElement>(`[data-action="${to < from ? "down" : "up"}"]`);
      if (same && !same.disabled) same.focus();
      else other?.focus();
    });
  };
  const ask = (index: number) => {
    if (schemaFormTreeHasData(item, value[index])) setPending(index);
    else remove(index);
  };

  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 3 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = keys.indexOf(String(active.id));
    const to = keys.indexOf(String(over.id));
    if (from >= 0 && to >= 0) move(from, to);
  };

  const allCollapsed = count > 0 && keys.every((k) => collapsed.has(k));
  const pendingName = pending === null ? "" : titleOf(pending).title;

  return (
    <ListShell node={node} path={path}>
      <div ref={root} className="flex min-w-0 flex-col gap-3">
        {count > 1 ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption tabular-nums text-muted-foreground">{node.max !== undefined ? t.countMax(n(count), n(node.max)) : t.count(n(count))}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(keys))}>
              <Icon icon={allCollapsed ? ChevronsUpDown : ChevronsDownUp} />
              {allCollapsed ? t.expandAll : t.collapseAll}
            </Button>
          </div>
        ) : null}

        {count === 0 ? (
          <div className="rounded-card border border-dashed border-border px-4 py-6 text-center text-body-sm text-muted-foreground">{t.empty(node.label)}</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={keys} strategy={verticalListSortingStrategy}>
              <ol aria-label={node.label} className="flex flex-col gap-2">
                {value.map((entry, index) => {
                  const itemPath = `${path}[${index}]`;
                  if (ctx.states[itemPath]?.visible === false) return null;
                  const key = keys[index] as string;
                  const { title, keys: used } = titleOf(index);
                  return (
                    <GroupRow
                      key={key}
                      rowKey={key}
                      path={itemPath}
                      title={title}
                      summary={schemaFormItemSummary(node, entry, used)}
                      position={n(index + 1)}
                      isFirst={index === 0}
                      isLast={index === count - 1}
                      canDrag={count > 1}
                      canRemove={canRemove(count, min)}
                      collapsed={collapsed.has(key)}
                      issues={ctx.issueCount(itemPath)}
                      onToggle={() =>
                        setCollapsed((cur) => {
                          const next = new Set(cur);
                          if (!next.delete(key)) next.add(key);
                          return next;
                        })
                      }
                      onMove={(delta) => move(index, index + delta)}
                      onRemove={() => ask(index)}
                    >
                      <SchemaNodes node={item} value={entry} path={itemPath} depth={1} />
                    </GroupRow>
                  );
                })}
              </ol>
            </SortableContext>
          </DndContext>
        )}

        <ListFooter node={node} path={path} count={count} min={min} onAdd={add} />
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.removeTitle(pendingName)}</AlertDialogTitle>
            <AlertDialogDescription>{t.removeBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending !== null) remove(pending);
                setPending(null);
              }}
            >
              {t.removeConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListShell>
  );
}

interface RowProps {
  rowKey: string;
  path: string;
  title: string;
  summary: string;
  position: string;
  isFirst: boolean;
  isLast: boolean;
  canDrag: boolean;
  canRemove: boolean;
  collapsed: boolean;
  issues: number;
  onToggle: () => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  children: ReactNode;
}

function GroupRow({ rowKey, path, title, summary, position, isFirst, isLast, canDrag, canRemove: removable, collapsed, issues, onToggle, onMove, onRemove, children }: RowProps) {
  const { t, disabled, locale } = useForm();
  const { setNodeRef, setActivatorNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: rowKey, disabled: disabled || !canDrag });
  const bodyId = useId();
  return (
    <li
      ref={setNodeRef}
      data-slot="schema-form-group"
      data-item-key={rowKey}
      data-schema-path={path}
      data-collapsed={collapsed || undefined}
      data-dragging={isDragging || undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="relative rounded-card border border-border bg-card data-dragging:z-10 data-dragging:border-nq-focus data-dragging:shadow-floating"
    >
      <div data-slot="schema-form-group-header" className="flex min-h-control items-center gap-1 p-1.5">
        {canDrag ? (
          <Tooltip content={t.drag(title)}>
            <span
              ref={setActivatorNodeRef}
              aria-hidden
              className="inline-flex size-control-sm shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground hover:bg-nq-hover hover:text-foreground active:cursor-grabbing [&_svg]:size-4"
              {...listeners}
            >
              <GripVertical aria-hidden />
            </span>
          </Tooltip>
        ) : null}
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          aria-label={collapsed ? t.expand(title) : t.collapse(title)}
          onClick={onToggle}
          className="flex min-h-control-sm min-w-0 flex-1 items-center gap-2 rounded-control px-1.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
        >
          <Icon icon={ChevronRight} directional className={cn("size-4 shrink-0 text-muted-foreground transition-[rotate] duration-200 ease-nq", !collapsed && "rotate-90 rtl:-rotate-90")} />
          <span className="min-w-0 truncate text-label text-foreground">{title}</span>
          {collapsed && summary ? <span className="min-w-0 flex-1 truncate text-body-sm text-muted-foreground">{summary}</span> : null}
        </button>
        <span className="sr-only">{position}</span>
        {issues > 0 ? (
          <Badge variant="danger" data-slot="schema-form-group-issues">
            {t.issues(formatNumber(issues, locale))}
          </Badge>
        ) : null}
        <Button type="button" variant="ghost" size="icon-sm" data-action="up" aria-label={t.moveUp(title)} disabled={disabled || isFirst} onClick={() => onMove(-1)}>
          <ChevronUp aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" data-action="down" aria-label={t.moveDown(title)} disabled={disabled || isLast} onClick={() => onMove(1)}>
          <ChevronDown aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" data-action="remove" aria-label={t.remove(title)} disabled={disabled || !removable} onClick={onRemove} className="text-muted-foreground hover:text-nq-danger-text">
          <Trash2 aria-hidden />
        </Button>
      </div>
      <div id={bodyId} data-slot="schema-form-group-body" hidden={collapsed} className="border-t border-border p-3 sm:p-4">
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
      </div>
    </li>
  );
}

/** Used by the summary to know which paths are inside a group. */
export { schemaPathInside, X as SchemaFormCloseIcon };
