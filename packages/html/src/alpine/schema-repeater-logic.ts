/*
 * The schema behind SchemaRepeater: field types, default rows and validation. Pure functions with no
 * React and no imports, so they run on the server (validate again there) and in node tests.
 */

export type SchemaRow = Record<string, unknown>;

interface SchemaFieldBase {
  /** The key in the row object. Unique within its schema. */
  key: string;
  label: string;
  description?: string;
  required?: boolean;
  /** "half" puts two fields side by side on wide screens. Default "full". */
  width?: "full" | "half";
  /** Hide the field (and skip its validation) depending on the rest of the row. */
  hidden?: (row: SchemaRow) => boolean;
  /** Your own rule, run after the built-in ones. Return a message to fail. */
  validate?: (value: unknown, row: SchemaRow) => string | null | undefined;
}

export interface SchemaTextField extends SchemaFieldBase {
  type: "text";
  defaultValue?: string;
  placeholder?: string;
  /** Input kind. Default "text". */
  inputType?: "text" | "email" | "url" | "tel";
  /** Multi-line text area. */
  multiline?: boolean;
  /** Force left-to-right entry, for emails, URLs and codes in Arabic forms. */
  ltr?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
  /** Message when `pattern` fails. */
  patternMessage?: string;
}

export interface SchemaNumberField extends SchemaFieldBase {
  type: "number";
  defaultValue?: number | null;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  /** Short text after the input, such as "%" or "SAR". */
  unit?: string;
}

export interface SchemaOption {
  value: string;
  label: string;
}

export interface SchemaSelectField extends SchemaFieldBase {
  type: "select";
  options: readonly SchemaOption[];
  defaultValue?: string | null;
  placeholder?: string;
}

export interface SchemaSwitchField extends SchemaFieldBase {
  type: "switch";
  defaultValue?: boolean;
}

export interface SchemaDateField extends SchemaFieldBase {
  type: "date";
  /** ISO date, YYYY-MM-DD. */
  defaultValue?: string | null;
  /** Earliest and latest ISO date. */
  min?: string;
  max?: string;
}

export interface SchemaRepeaterField extends SchemaFieldBase {
  type: "repeater";
  /** The fields of each nested row. */
  fields: readonly SchemaField[];
  defaultValue?: SchemaRow[];
  min?: number;
  max?: number;
  /** Text for the nested add button. */
  addLabel?: string;
  /** Key of a text field whose value titles each nested row. */
  titleKey?: string;
}

export type SchemaField = SchemaTextField | SchemaNumberField | SchemaSelectField | SchemaSwitchField | SchemaDateField | SchemaRepeaterField;

/* ------------------------------------------------------------------ messages */

export interface SchemaMessages {
  required: (label: string) => string;
  minLength: (label: string, n: number) => string;
  maxLength: (label: string, n: number) => string;
  pattern: (label: string) => string;
  email: (label: string) => string;
  url: (label: string) => string;
  number: (label: string) => string;
  integer: (label: string) => string;
  min: (label: string, n: number) => string;
  max: (label: string, n: number) => string;
  option: (label: string) => string;
  date: (label: string) => string;
  dateMin: (label: string, date: string) => string;
  dateMax: (label: string, date: string) => string;
  minRows: (label: string, n: number) => string;
  maxRows: (label: string, n: number) => string;
}

export const SCHEMA_MESSAGES: { en: SchemaMessages; ar: SchemaMessages } = {
  en: {
    required: (l) => `${l} is required.`,
    minLength: (l, n) => `${l} needs at least ${n} characters.`,
    maxLength: (l, n) => `${l} can have at most ${n} characters.`,
    pattern: (l) => `${l} is not in the right format.`,
    email: (l) => `${l} must be a valid email address.`,
    url: (l) => `${l} must be a valid URL.`,
    number: (l) => `${l} must be a number.`,
    integer: (l) => `${l} must be a whole number.`,
    min: (l, n) => `${l} must be at least ${n}.`,
    max: (l, n) => `${l} must be at most ${n}.`,
    option: (l) => `Choose a valid option for ${l}.`,
    date: (l) => `${l} must be a valid date.`,
    dateMin: (l, d) => `${l} must be on or after ${d}.`,
    dateMax: (l, d) => `${l} must be on or before ${d}.`,
    minRows: (l, n) => `Add at least ${n} in ${l}.`,
    maxRows: (l, n) => `${l} can have at most ${n}.`,
  },
  ar: {
    required: (l) => `${l} مطلوب.`,
    minLength: (l, n) => `${l} يحتاج ${n} أحرف على الأقل.`,
    maxLength: (l, n) => `${l} لا يمكن أن يتجاوز ${n} حرفًا.`,
    pattern: (l) => `صيغة ${l} غير صحيحة.`,
    email: (l) => `${l} يجب أن يكون بريدًا إلكترونيًا صالحًا.`,
    url: (l) => `${l} يجب أن يكون رابطًا صالحًا.`,
    number: (l) => `${l} يجب أن يكون رقمًا.`,
    integer: (l) => `${l} يجب أن يكون عددًا صحيحًا.`,
    min: (l, n) => `${l} يجب ألا يقل عن ${n}.`,
    max: (l, n) => `${l} يجب ألا يزيد على ${n}.`,
    option: (l) => `اختر خيارًا صالحًا لـ ${l}.`,
    date: (l) => `${l} يجب أن يكون تاريخًا صالحًا.`,
    dateMin: (l, d) => `${l} يجب أن يكون في ${d} أو بعده.`,
    dateMax: (l, d) => `${l} يجب أن يكون في ${d} أو قبله.`,
    minRows: (l, n) => `أضف ${n} على الأقل في ${l}.`,
    maxRows: (l, n) => `${l} لا يمكن أن يزيد على ${n}.`,
  },
};

/* ------------------------------------------------------------------ rows */

/** The default value of one field. */
export function defaultValue(field: SchemaField): unknown {
  switch (field.type) {
    case "text":
      return field.defaultValue ?? "";
    case "number":
      return field.defaultValue ?? null;
    case "select":
      return field.defaultValue ?? null;
    case "switch":
      return field.defaultValue ?? false;
    case "date":
      return field.defaultValue ?? null;
    case "repeater":
      return (field.defaultValue ?? []).map((row) => ({ ...row }));
  }
}

/** A new row with every field at its default. */
export function defaultRow(fields: readonly SchemaField[]): SchemaRow {
  const row: SchemaRow = {};
  for (const field of fields) row[field.key] = defaultValue(field);
  return row;
}

/** Whether a value counts as "not filled in". Switches are never empty: off is an answer. */
export function isEmpty(field: SchemaField, value: unknown): boolean {
  if (field.type === "switch") return false;
  if (field.type === "repeater") return !Array.isArray(value) || value.length === 0;
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

/* ------------------------------------------------------------------ validation */

export interface FieldIssue {
  /** The message for this field. For a nested repeater: the row-count message. */
  message?: string;
  /** Nested repeater only: the issues of each row, by index. */
  rows?: RowErrors[];
}
/** Issues of one row, by field key. Fields without issues are absent. */
export type RowErrors = Record<string, FieldIssue>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function isUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** The first problem with a scalar field's value, or undefined. Nested repeaters are handled by `validateRow`. */
export function validateField(
  field: SchemaField,
  value: unknown,
  row: SchemaRow,
  messages: SchemaMessages,
  formatDate: (iso: string) => string = (iso) => iso,
): string | undefined {
  const label = field.label;
  if (field.type === "repeater") return undefined;
  if (isEmpty(field, value)) {
    if (field.required) return messages.required(label);
    return field.validate?.(value, row) || undefined;
  }
  switch (field.type) {
    case "text": {
      const text = String(value);
      if (field.minLength !== undefined && text.trim().length < field.minLength) return messages.minLength(label, field.minLength);
      if (field.maxLength !== undefined && text.length > field.maxLength) return messages.maxLength(label, field.maxLength);
      if (field.inputType === "email" && !EMAIL.test(text.trim())) return messages.email(label);
      if (field.inputType === "url" && !isUrl(text.trim())) return messages.url(label);
      if (field.pattern !== undefined) {
        const re = typeof field.pattern === "string" ? new RegExp(field.pattern) : field.pattern;
        if (!re.test(text)) return field.patternMessage ?? messages.pattern(label);
      }
      break;
    }
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) return messages.number(label);
      if (field.integer && !Number.isInteger(value)) return messages.integer(label);
      if (field.min !== undefined && value < field.min) return messages.min(label, field.min);
      if (field.max !== undefined && value > field.max) return messages.max(label, field.max);
      break;
    }
    case "select":
      if (!field.options.some((o) => o.value === value)) return messages.option(label);
      break;
    case "date": {
      const iso = String(value);
      if (!isRealDate(iso)) return messages.date(label);
      if (field.min !== undefined && iso < field.min) return messages.dateMin(label, formatDate(field.min));
      if (field.max !== undefined && iso > field.max) return messages.dateMax(label, formatDate(field.max));
      break;
    }
    case "switch":
      break;
  }
  return field.validate?.(value, row) || undefined;
}

/** Validates one row, descending into nested repeaters. Hidden fields are skipped. */
export function validateRow(
  fields: readonly SchemaField[],
  row: SchemaRow,
  messages: SchemaMessages,
  formatDate?: (iso: string) => string,
): RowErrors {
  const errors: RowErrors = {};
  for (const field of fields) {
    if (field.hidden?.(row)) continue;
    const value = row[field.key];
    if (field.type === "repeater") {
      const list = Array.isArray(value) ? (value as SchemaRow[]) : [];
      const issue: FieldIssue = {};
      const min = Math.max(field.min ?? 0, field.required ? 1 : 0);
      if (list.length < min) issue.message = messages.minRows(field.label, min);
      else if (field.max !== undefined && list.length > field.max) issue.message = messages.maxRows(field.label, field.max);
      else {
        const custom = field.validate?.(value, row);
        if (custom) issue.message = custom;
      }
      const nested = list.map((r) => validateRow(field.fields, r, messages, formatDate));
      if (nested.some((r) => Object.keys(r).length > 0)) issue.rows = nested;
      if (issue.message || issue.rows) errors[field.key] = issue;
      continue;
    }
    const message = validateField(field, value, row, messages, formatDate);
    if (message) errors[field.key] = { message };
  }
  return errors;
}

export interface SchemaValidation {
  /** Row-count message (min / max), when it fails. */
  message?: string;
  /** Issues of each row, by index. Rows without issues are empty objects. */
  rows: RowErrors[];
  /** Number of failing fields and count messages, all levels. */
  count: number;
  valid: boolean;
}

/** Number of issues in a list of row errors, counting nested repeaters. */
export function countIssues(rows: readonly RowErrors[]): number {
  let total = 0;
  for (const row of rows) {
    for (const issue of Object.values(row)) {
      if (issue.message) total += 1;
      if (issue.rows) total += countIssues(issue.rows);
    }
  }
  return total;
}

/** Validates every row against the schema and the row limits. Run it again on the server. */
export function validateRows(
  fields: readonly SchemaField[],
  rows: readonly SchemaRow[],
  options: { min?: number; max?: number; label?: string; messages?: SchemaMessages; formatDate?: (iso: string) => string } = {},
): SchemaValidation {
  const messages = options.messages ?? SCHEMA_MESSAGES.en;
  const label = options.label ?? "";
  const result = rows.map((row) => validateRow(fields, row, messages, options.formatDate));
  let message: string | undefined;
  if (options.min !== undefined && rows.length < options.min) message = messages.minRows(label, options.min);
  else if (options.max !== undefined && rows.length > options.max) message = messages.maxRows(label, options.max);
  const count = countIssues(result) + (message ? 1 : 0);
  return { message, rows: result, count, valid: count === 0 };
}
