"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { DatePicker } from "../date-picker";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { formatDate, formatNumber } from "../numeric";
import { Repeater, type RepeaterLabels } from "../repeater";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Switch } from "../switch";
import {
  countIssues,
  defaultRow,
  type FieldIssue,
  type RowErrors,
  SCHEMA_MESSAGES,
  type SchemaField,
  type SchemaMessages,
  type SchemaRow,
  type SchemaValidation,
  validateRows,
} from "./schema";


/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    select: "Select…",
    issues: (n: string) => (n === "1" ? "1 issue" : `${n} issues`),
    itemsLabel: "Rows",
  },
  ar: {
    select: "اختر…",
    issues: (n: string) => (n === "1" ? "مشكلة واحدة" : `${n} مشكلات`),
    itemsLabel: "الصفوف",
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

/* ------------------------------------------------------------------ props */

export interface SchemaRepeaterProps {
  /** What each row contains. */
  fields: readonly SchemaField[];
  /** The rows: one object per row, keyed by `field.key`. Controlled. */
  value?: SchemaRow[];
  defaultValue?: SchemaRow[];
  onValueChange?: (value: SchemaRow[]) => void;
  /** Rows cannot be removed below this count, and validation asks for at least this many. */
  min?: number;
  /** "Add" and "Duplicate" stop here. */
  max?: number;
  /** Accessible name of the list, and the name used in the row-count messages. Localise it. */
  label?: string;
  /** Key of a text field whose value titles each row. Default: "Item 1", "Item 2"… */
  titleKey?: string;
  /** Custom row heading. Wins over `titleKey`. */
  rowTitle?: (row: SchemaRow, index: number) => ReactNode;
  /** Reveal every error now, for example after a failed submit. Otherwise a field shows its error once it was edited. */
  showErrors?: boolean;
  /** Errors from the server, by row and field key. They show at once. */
  errors?: readonly RowErrors[];
  /** Called when the number of issues changes, with the full result. Use it to enable or block Save. */
  onValidate?: (result: SchemaValidation) => void;
  /** Override any built-in message (English or Arabic by the Nasaq locale). */
  messages?: Partial<SchemaMessages>;
  /** Override the repeater strings: add, remove, duplicate, empty, … */
  labels?: RepeaterLabels;
  addLabel?: ReactNode;
  empty?: ReactNode;
  reorderable?: boolean;
  duplicable?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  disabled?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ shared state */

interface SchemaContext {
  messages: SchemaMessages;
  locale: string;
  showErrors: boolean;
  touched: ReadonlySet<string>;
  touch: (id: string) => void;
  repeaterProps: Pick<SchemaRepeaterProps, "reorderable" | "duplicable" | "collapsible" | "disabled" | "labels">;
}
const Ctx = createContext<SchemaContext | null>(null);
const useSchema = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Schema rows must render inside <SchemaRepeater>.");
  return ctx;
};

const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dateOf = (iso: unknown): Date | null => {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};

/** One line that says what a row holds, for the collapsed header: the first few filled values. */
function summaryOf(fields: readonly SchemaField[], row: SchemaRow, skip: string | undefined, locale: string): string {
  const parts: string[] = [];
  for (const field of fields) {
    if (parts.length >= 3) break;
    if (field.key === skip || field.type === "switch" || field.type === "repeater") continue;
    const value = row[field.key];
    if (value === null || value === undefined || value === "") continue;
    if (field.type === "select") parts.push(field.options.find((o) => o.value === value)?.label ?? String(value));
    else if (field.type === "number" && typeof value === "number") parts.push(`${formatNumber(value, locale)}${field.unit ? ` ${field.unit}` : ""}`);
    else if (field.type === "date") {
      const date = dateOf(value);
      parts.push(date ? formatDate(date, locale, { dateStyle: "medium" }) : String(value));
    } else parts.push(String(value));
  }
  return parts.join(" · ");
}

/* ------------------------------------------------------------------ SchemaRepeater */

/**
 * A repeater whose rows are generated from a field schema: text, number, select, switch, date and nested
 * repeaters, each with validation (required, lengths, ranges, patterns, your own rules). The value is plain
 * JSON. Errors show as soon as a field is edited, or all at once with `showErrors`.
 */
export function SchemaRepeater({
  fields,
  value: valueProp,
  defaultValue,
  onValueChange,
  min,
  max,
  label,
  titleKey,
  rowTitle,
  showErrors = false,
  errors: serverErrors,
  onValidate,
  messages: messageOverrides,
  labels,
  addLabel,
  empty,
  reorderable,
  duplicable,
  collapsible,
  defaultCollapsed,
  disabled,
  className,
}: SchemaRepeaterProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = strings(locale);
  const [inner, setInner] = useState<SchemaRow[]>(defaultValue ?? []);
  const value = valueProp ?? inner;
  const setValue = (next: SchemaRow[]) => {
    if (valueProp === undefined) setInner(next);
    onValueChange?.(next);
  };

  const messages = useMemo<SchemaMessages>(
    () => ({ ...SCHEMA_MESSAGES[locale.startsWith("ar") ? "ar" : "en"], ...messageOverrides }),
    [locale, messageOverrides],
  );
  const name = label ?? t.itemsLabel;
  const validation = useMemo(
    () => validateRows(fields, value, { min, max, label: name, messages, formatDate: (iso) => formatDate(dateOf(iso) ?? iso, locale, { dateStyle: "medium" }) }),
    [fields, value, min, max, name, messages, locale],
  );

  const signature = `${validation.count}|${validation.message ?? ""}`;
  const lastSignature = useRef<string | null>(null);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    onValidate?.(validation);
    // `validation` changes with the value; the signature is what says the outcome changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const [listTouched, setListTouched] = useState(false);
  const touch = (id: string) => setTouched((cur) => (cur.has(id) ? cur : new Set(cur).add(id)));
  const context: SchemaContext = {
    messages,
    locale,
    showErrors,
    touched,
    touch,
    repeaterProps: { reorderable, duplicable, collapsible, disabled, labels },
  };

  const countMessage = validation.message && (showErrors || listTouched) ? validation.message : undefined;

  return (
    <Ctx.Provider value={context}>
      <div data-slot="schema-repeater" className={cn("flex flex-col gap-2", className)}>
        <SchemaRows
          fields={fields}
          value={value}
          onChange={(next) => {
            setListTouched(true);
            setValue(next);
          }}
          issues={validation.rows}
          serverIssues={serverErrors}
          min={min}
          max={max}
          label={name}
          titleKey={titleKey}
          rowTitle={rowTitle}
          addLabel={addLabel}
          empty={empty}
          defaultCollapsed={defaultCollapsed}
        />
        {countMessage ? (
          <p role="alert" data-slot="schema-repeater-error" className="text-caption text-nq-danger-text">
            {countMessage}
          </p>
        ) : null}
      </div>
    </Ctx.Provider>
  );
}

/* ------------------------------------------------------------------ rows */

interface RowsProps {
  fields: readonly SchemaField[];
  value: SchemaRow[];
  onChange: (next: SchemaRow[]) => void;
  issues: readonly RowErrors[];
  serverIssues?: readonly RowErrors[];
  min?: number;
  max?: number;
  label?: string;
  titleKey?: string;
  rowTitle?: (row: SchemaRow, index: number) => ReactNode;
  addLabel?: ReactNode;
  empty?: ReactNode;
  defaultCollapsed?: boolean;
}

function SchemaRows({ fields, value, onChange, issues, serverIssues, min, max, label, titleKey, rowTitle, addLabel, empty, defaultCollapsed }: RowsProps) {
  const { locale, showErrors, touched, repeaterProps } = useSchema();
  const t = strings(locale);
  return (
    <Repeater<SchemaRow>
      value={value}
      onValueChange={onChange}
      createItem={() => defaultRow(fields)}
      cloneItem={(row) => structuredClone(row)}
      min={min}
      max={max}
      label={label}
      addLabel={addLabel}
      empty={empty}
      defaultCollapsed={defaultCollapsed}
      {...repeaterProps}
      rowTitle={(row, index) => rowTitle?.(row, index) ?? (titleKey && typeof row[titleKey] === "string" && row[titleKey] ? (row[titleKey] as string) : undefined)}
      rowSummary={(row) => summaryOf(fields, row, titleKey, locale)}
      rowMeta={(_row, index, id) => {
        const rowIssues = issues[index];
        const count = rowIssues ? countIssues([rowIssues]) : 0;
        if (!count) return null;
        const seen = showErrors || [...touched].some((k) => k.startsWith(`${id}.`)) || Boolean(serverIssues?.[index]);
        return seen ? (
          <Badge variant="danger" data-slot="schema-repeater-issues">
            {t.issues(formatNumber(count, locale))}
          </Badge>
        ) : null;
      }}
      renderRow={(row, ctx) => (
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          {fields.map((field) =>
            field.hidden?.(row) ? null : (
              <SchemaFieldControl
                key={field.key}
                field={field}
                rowId={ctx.id}
                value={row[field.key]}
                issue={issues[ctx.index]?.[field.key]}
                serverIssue={serverIssues?.[ctx.index]?.[field.key]}
                disabled={ctx.disabled}
                onChange={(next) => ctx.update((cur) => ({ ...cur, [field.key]: next }))}
              />
            ),
          )}
        </div>
      )}
    />
  );
}

/* ------------------------------------------------------------------ one field */

interface FieldControlProps {
  field: SchemaField;
  rowId: string;
  value: unknown;
  issue?: FieldIssue;
  serverIssue?: FieldIssue;
  disabled: boolean;
  onChange: (value: unknown) => void;
}

function SchemaFieldControl({ field, rowId, value, issue, serverIssue, disabled, onChange }: FieldControlProps) {
  const { locale, showErrors, touched, touch } = useSchema();
  const t = strings(locale);
  const path = `${rowId}.${field.key}`;
  const revealed = showErrors || touched.has(path);
  const message = serverIssue?.message ?? (revealed ? issue?.message : undefined);
  const span = field.type === "switch" || field.type === "repeater" || field.type === "text" && field.multiline || field.width !== "half" ? "sm:col-span-2" : "";

  if (field.type === "repeater") {
    return (
      <NestedRepeater
        field={field}
        rowId={rowId}
        value={Array.isArray(value) ? (value as SchemaRow[]) : []}
        issue={issue}
        serverIssue={serverIssue}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  const error = message ? <FieldError match>{message}</FieldError> : null;
  const description = field.description ? <FieldDescription>{field.description}</FieldDescription> : null;
  const label = (
    <FieldLabel>
      {field.label}
      {field.required ? (
        <span aria-hidden className="ms-0.5 text-nq-danger-text">
          *
        </span>
      ) : null}
    </FieldLabel>
  );

  switch (field.type) {
    case "text": {
      const common = {
        value: typeof value === "string" ? value : "",
        disabled,
        placeholder: field.placeholder,
        required: field.required,
        onChange: (e: { currentTarget: { value: string } }) => {
          touch(path);
          onChange(e.currentTarget.value);
        },
        onBlur: () => touch(path),
      };
      return (
        <Field invalid={!!message} disabled={disabled} className={span}>
          {label}
          {field.multiline ? (
            <Textarea {...common} dir={field.ltr ? "ltr" : undefined} />
          ) : (
            <Input {...common} type={field.inputType ?? "text"} ltr={field.ltr || field.inputType === "email" || field.inputType === "url" || field.inputType === "tel"} />
          )}
          {description}
          {error}
        </Field>
      );
    }
    case "number":
      return (
        <Field invalid={!!message} disabled={disabled} className={span}>
          {label}
          <div className="relative">
            <Input
              ltr
              type="number"
              inputMode={field.integer ? "numeric" : "decimal"}
              value={typeof value === "number" && Number.isFinite(value) ? String(value) : ""}
              min={field.min}
              max={field.max}
              step={field.step ?? (field.integer ? 1 : "any")}
              placeholder={field.placeholder}
              disabled={disabled}
              className={field.unit ? "pe-12" : undefined}
              onChange={(e) => {
                touch(path);
                const raw = e.currentTarget.value;
                onChange(raw === "" ? null : Number(raw));
              }}
              onBlur={() => touch(path)}
            />
            {field.unit ? (
              <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-body-sm text-muted-foreground">{field.unit}</span>
            ) : null}
          </div>
          {description}
          {error}
        </Field>
      );
    case "select":
      return (
        <Field invalid={!!message} disabled={disabled} className={span}>
          {label}
          <Select
            items={field.options.map((o) => ({ value: o.value, label: o.label }))}
            value={typeof value === "string" ? value : null}
            disabled={disabled}
            onValueChange={(next) => {
              touch(path);
              onChange(next ?? null);
            }}
          >
            <SelectTrigger onBlur={() => touch(path)}>
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
          {description}
          {error}
        </Field>
      );
    case "switch":
      return (
        <Field invalid={!!message} disabled={disabled} className={cn(span, "flex-row items-start justify-between gap-4 rounded-control border border-border px-3 py-2.5")}>
          <div className="flex min-w-0 flex-col gap-0.5">
            {label}
            {description}
            {error}
          </div>
          <Switch checked={value === true} disabled={disabled} aria-label={field.label} onCheckedChange={(next) => (touch(path), onChange(next))} />
        </Field>
      );
    case "date":
      return (
        <Field invalid={!!message} disabled={disabled} className={span}>
          {label}
          <DatePicker
            value={dateOf(value)}
            disabled={disabled}
            min={dateOf(field.min) ?? undefined}
            max={dateOf(field.max) ?? undefined}
            aria-label={field.label}
            onValueChange={(next) => {
              touch(path);
              onChange(next ? isoOf(next) : null);
            }}
          />
          {description}
          {error}
        </Field>
      );
  }
}

/* ------------------------------------------------------------------ nested repeater */

function NestedRepeater({
  field,
  rowId,
  value,
  issue,
  serverIssue,
  disabled,
  onChange,
}: {
  field: Extract<SchemaField, { type: "repeater" }>;
  rowId: string;
  value: SchemaRow[];
  issue?: FieldIssue;
  serverIssue?: FieldIssue;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const { showErrors, touched, touch } = useSchema();
  const path = `${rowId}.${field.key}`;
  const revealed = showErrors || touched.has(path);
  const message = serverIssue?.message ?? (revealed ? issue?.message : undefined);
  const min = Math.max(field.min ?? 0, field.required ? 1 : 0);
  return (
    <fieldset data-slot="schema-repeater-nested" disabled={disabled} className="flex min-w-0 flex-col gap-2 border-0 p-0 sm:col-span-2">
      <legend className="mb-1 text-label text-foreground">
        {field.label}
        {field.required ? (
          <span aria-hidden className="ms-0.5 text-nq-danger-text">
            *
          </span>
        ) : null}
      </legend>
      {field.description ? <p className="-mt-1 text-caption text-muted-foreground">{field.description}</p> : null}
      <SchemaRows
        fields={field.fields}
        value={value}
        onChange={(next) => {
          touch(path);
          onChange(next);
        }}
        issues={issue?.rows ?? []}
        serverIssues={serverIssue?.rows}
        min={min || undefined}
        max={field.max}
        label={field.label}
        titleKey={field.titleKey}
        addLabel={field.addLabel}
      />
      {message ? (
        <p role="alert" className="text-caption text-nq-danger-text">
          {message}
        </p>
      ) : null}
    </fieldset>
  );
}
