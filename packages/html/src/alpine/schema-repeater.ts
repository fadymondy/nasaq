// nqSchemaRepeater: the state and validation behind <x-nq::schema-repeater>. The Blade component renders one control per schema field
// inside an <x-nq::repeater>; this holds the rows, runs the same validation as the React SchemaRepeater and tells the controls which
// message to show. A field shows its error once it was edited, or all at once with show-errors.
//
//   <div x-data="nqSchemaRepeater({ fields, rows, min, max, label, titleKey, showErrors, serverErrors, messages })"
//        x-on:nq-schema-validate="saveDisabled = ! $event.detail.valid">
//     <div x-data="nqRepeater(…)" x-modelable="items" x-model="rows">…</div>
//   </div>
//
// Fires nq-schema-validate ({ valid, count, message, rows }) when the number of issues changes.
// Fields may carry hiddenWhen: { key, equals } (hidden, and not validated, while row[key] === equals).

import {
  countIssues,
  defaultRow,
  type FieldIssue,
  SCHEMA_MESSAGES,
  type SchemaField,
  type SchemaMessages,
  type SchemaRow,
  validateField,
  validateRow,
  validateRows,
} from "./schema-repeater-logic";
import type { Magics, Register } from "./types";

type Row = SchemaRow;
type WireField = SchemaField & { hiddenWhen?: { key: string; equals: unknown } };
type Fields = readonly WireField[];

interface Config {
  fields: Fields;
  rows?: Row[];
  min?: number | null;
  max?: number | null;
  label?: string | null;
  titleKey?: string | null;
  showErrors?: boolean;
  /** Errors from the server for the top-level rows: [{ fieldKey: "message" }]. */
  serverErrors?: Array<Record<string, string>>;
  /** Overrides of the built-in messages, as templates with :label, :n and :date. */
  messages?: Partial<Record<keyof SchemaMessages, string>>;
}

interface State extends Magics {
  $nq: { t(en: string, ar: string): string; locale: string };
  fields: Fields;
  rows: Row[];
  touch(item: Row, key: string): void;
  isTouched(item: Row, key: string): boolean;
  min: number | undefined;
  max: number | undefined;
  label: string | null;
  titleKey: string | null;
  showErrors: boolean;
  serverErrors: Array<Record<string, string>>;
  overrides: Partial<Record<keyof SchemaMessages, string>>;
  v: number;
  listTouched: boolean;
  signature: string;
  touchedBy: WeakMap<object, Set<string>>;
  msgs(): SchemaMessages;
  fmtNumber(n: number): string;
  fmtDate(iso: string): string;
  validation(): ReturnType<typeof validateRows>;
  levelAt(path: string): SchemaField[];
  fieldAt(path: string): SchemaField;
}

const hideable = (fields: Fields): SchemaField[] =>
  fields.map((f) => {
    const out = { ...f } as WireField & { hidden?: (row: Row) => boolean };
    const when = f.hiddenWhen;
    if (when) out.hidden = (row) => row[when.key] === when.equals;
    if (out.type === "repeater") out.fields = hideable(out.fields as Fields);
    return out;
  });

/** Missing keys get their default, so a row from the server never leaves a control without a value. */
function normalize(fields: SchemaField[], rows: Row[]): Row[] {
  return rows.map((row) => {
    const base = defaultRow(fields);
    const out: Row = { ...base, ...row };
    for (const f of fields) if (f.type === "repeater") out[f.key] = normalize([...f.fields], Array.isArray(out[f.key]) ? (out[f.key] as Row[]) : []);
    return out;
  });
}

const fill = (template: string, label: string, n?: number | string, date?: string) =>
  template.replace(":label", label).replace(":n", String(n ?? "")).replace(":date", date ?? "");

export const schemaRepeater: Register = (Alpine) => {
  Alpine.data("nqSchemaRepeater", (config: Config) => {
    const fields = hideable(config.fields);
    return {
      fields,
      rows: normalize(fields, config.rows ?? []),
      min: config.min ?? undefined,
      max: config.max ?? undefined,
      label: config.label ?? null,
      titleKey: config.titleKey ?? null,
      showErrors: Boolean(config.showErrors),
      serverErrors: config.serverErrors ?? [],
      overrides: config.messages ?? {},
      v: 0,
      listTouched: false,
      signature: "",
      touchedBy: new WeakMap<object, Set<string>>(),

      init(this: State) {
        const watcher = () => {
          const result = this.validation();
          const signature = `${result.count}|${result.message ?? ""}`;
          if (signature === this.signature) return;
          this.signature = signature;
          this.$dispatch("nq-schema-validate", { valid: result.valid, count: result.count, message: result.message ?? null, rows: result.rows });
        };
        this.$watch("rows", watcher);
        this.$nextTick(watcher);
      },

      msgs(this: State): SchemaMessages {
        const base = SCHEMA_MESSAGES[this.$nq.locale.startsWith("ar") ? "ar" : "en"];
        const o = this.overrides;
        const pick = <K extends keyof SchemaMessages>(key: K) => {
          const template = o[key];
          return template === undefined ? base[key] : ((label: string, n?: number | string) => fill(template, label, n, typeof n === "string" ? n : undefined));
        };
        return {
          required: pick("required"),
          minLength: pick("minLength"),
          maxLength: pick("maxLength"),
          pattern: pick("pattern"),
          email: pick("email"),
          url: pick("url"),
          number: pick("number"),
          integer: pick("integer"),
          min: pick("min"),
          max: pick("max"),
          option: pick("option"),
          date: pick("date"),
          dateMin: pick("dateMin"),
          dateMax: pick("dateMax"),
          minRows: pick("minRows"),
          maxRows: pick("maxRows"),
        } as SchemaMessages;
      },
      fmtNumber(this: State, n: number) {
        return new Intl.NumberFormat(this.$nq.locale.startsWith("ar") ? "ar-u-nu-arab" : "en").format(n);
      },
      fmtDate(this: State, iso: string) {
        const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
        return new Intl.DateTimeFormat(this.$nq.locale, { dateStyle: "medium" }).format(new Date(y, m - 1, d));
      },

      /** The whole-list result. Reading `rows` here makes every message reactive. */
      validation(this: State) {
        return validateRows(this.fields as SchemaField[], this.rows, {
          ...(this.min !== undefined ? { min: this.min } : {}),
          ...(this.max !== undefined ? { max: this.max } : {}),
          label: this.label ?? this.$nq.t("Rows", "الصفوف"),
          messages: this.msgs(),
          formatDate: (iso) => this.fmtDate(iso),
        });
      },
      countMessage(this: State) {
        const message = this.validation().message;
        return message && (this.showErrors || this.listTouched) ? message : "";
      },
      onRowsChange(this: State, event: Event) {
        const detail = (event as CustomEvent).detail as { items?: unknown } | null;
        if (detail && Array.isArray(detail.items)) this.listTouched = true;
      },

      /** The fields of one level: "" is the top, "2" the nested fields of the third field, "2.1" one deeper. */
      levelAt(this: State, path: string): SchemaField[] {
        let level = this.fields as SchemaField[];
        for (const part of path ? path.split(".") : []) {
          const field = level[Number(part)];
          level = field && field.type === "repeater" ? ([...field.fields] as SchemaField[]) : [];
        }
        return level;
      },
      /** One field by its path: "1" or "2.0" (a nested repeater's first field). */
      fieldAt(this: State, path: string): SchemaField {
        const parts = path.split(".");
        const last = parts.pop() as string;
        return this.levelAt(parts.join("."))[Number(last)] as SchemaField;
      },

      newRow(this: State, path?: string) {
        return defaultRow(this.levelAt(path ?? ""));
      },
      rowTitle(this: State, item: Row) {
        const key = this.titleKey;
        return key && typeof item[key] === "string" && item[key] ? (item[key] as string) : "";
      },
      rowSummary(this: State, item: Row, path?: string) {
        const parts: string[] = [];
        for (const field of this.levelAt(path ?? "")) {
          if (parts.length >= 3) break;
          if (field.key === this.titleKey || field.type === "switch" || field.type === "repeater") continue;
          const value = item[field.key];
          if (value === null || value === undefined || value === "") continue;
          if (field.type === "select") parts.push(field.options.find((o) => o.value === value)?.label ?? String(value));
          else if (field.type === "number" && typeof value === "number") parts.push(`${this.fmtNumber(value)}${field.unit ? ` ${field.unit}` : ""}`);
          else if (field.type === "date" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) parts.push(this.fmtDate(value));
          else parts.push(String(value));
        }
        return parts.join(" · ");
      },

      touch(this: State, item: Row, key: string) {
        const set = this.touchedBy.get(item) ?? new Set<string>();
        if (set.has(key)) return;
        set.add(key);
        this.touchedBy.set(item, set);
        this.v++;
      },
      isTouched(this: State, item: Row, key: string) {
        void this.v;
        return Boolean(this.touchedBy.get(item)?.has(key));
      },
      /** The error message to show under one control ("" for none). `index` is the top-level row index, for server errors. */
      msg(this: State, item: Row, path: string, index?: number | null) {
        const field = this.fieldAt(path);
        const server = index !== null && index !== undefined ? this.serverErrors[index]?.[field.key] : undefined;
        if (server) return server;
        if (!this.showErrors && !this.isTouched(item, field.key)) return "";
        if (field.type === "repeater") {
          const issue = validateRow([field], item, this.msgs(), (iso) => this.fmtDate(iso))[field.key] as FieldIssue | undefined;
          return issue?.message ?? "";
        }
        return validateField(field, item[field.key], item, this.msgs(), (iso) => this.fmtDate(iso)) ?? "";
      },
      hidden(this: State, item: Row, path: string) {
        const field = this.fieldAt(path) as WireField;
        return Boolean(field.hiddenWhen && item[field.hiddenWhen.key] === field.hiddenWhen.equals);
      },
      /** How many issues to show in a row's badge: none until something in the row was edited, or show-errors. */
      issueCount(this: State, item: Row, path: string, index?: number | null) {
        void this.v;
        const fieldsHere = this.levelAt(path);
        const count = countIssues([validateRow(fieldsHere, item, this.msgs(), (iso) => this.fmtDate(iso))]);
        if (!count) return 0;
        const seen = this.showErrors || (this.touchedBy.get(item)?.size ?? 0) > 0 || (index !== null && index !== undefined && Boolean(this.serverErrors[index]));
        return seen ? count : 0;
      },
      issuesText(this: State, count: number) {
        const c = this.fmtNumber(count);
        return count === 1 ? this.$nq.t("1 issue", "مشكلة واحدة") : this.$nq.t(`${c} issues`, `${c} مشكلات`);
      },
      setNumber(this: State, item: Row, key: string, raw: string) {
        this.touch(item, key);
        item[key] = raw === "" ? null : Number(raw);
      },
    };
  });
};
