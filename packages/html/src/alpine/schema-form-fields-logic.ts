/*
 * Turns a JSON Schema (the common subset) into the field list SchemaForm renders. Pure: only `import type`, so it
 * runs on the server and in node tests. Helper names start with `schemaForm` to keep the package barrel clash free.
 */
import type { SchemaField, SchemaOption } from "./schema-repeater-logic";

export interface SchemaFormJson {
  type?: string | string[];
  title?: string;
  description?: string;
  format?: string;
  enum?: readonly (string | number)[];
  oneOf?: readonly { const: string | number; title?: string; "x-title-ar"?: string }[];
  properties?: Record<string, SchemaFormJson>;
  required?: readonly string[];
  items?: SchemaFormJson;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  /** Arrays: no repeated values. An enum with this becomes a checkbox group. */
  uniqueItems?: boolean;
  $ref?: string;
  $defs?: Record<string, SchemaFormJson>;
  definitions?: Record<string, SchemaFormJson>;
  /** Extensions. */
  "x-title-ar"?: string;
  "x-description-ar"?: string;
  "x-placeholder"?: string;
  "x-widget"?: "textarea" | "ltr";
  "x-unit"?: string;
  "x-width"?: "half" | "full";
  "x-title-key"?: string;
  /** Array items that are objects: what titles each group. A property key ("name"), or a template ("{name} - {role}"). */
  "x-title"?: string;
  "x-enum-titles"?: Record<string, string>;
  "x-enum-titles-ar"?: Record<string, string>;
  /** A foreign key: the value is the id of a record in `resource`. */
  "x-relation"?: { resource: string; multiple?: boolean };
  /** Order among siblings; lower first. Properties without one keep their schema order. */
  "x-order"?: number;
}

export interface SchemaFormRelation {
  resource: string;
  multiple: boolean;
}

/** A field of the form. Extends the repeater field with what only a form needs. */
export type SchemaFormField = SchemaField & {
  /** Set for fields taken from a nested object. */
  section?: string;
  /** Set for `x-relation`: the field is rendered by a RelationPicker. */
  relation?: SchemaFormRelation;
};

export interface SchemaFormSection {
  id: string;
  title: string;
}

export interface SchemaFormPlan {
  fields: SchemaFormField[];
  sections: SchemaFormSection[];
  /** Keys whose select values are numbers in the schema. */
  numericEnums: string[];
  /** Keys that could not become a field, with the reason, so a caller can warn. */
  unsupported: { key: string; reason: string }[];
}

/** "first_name" and "firstName" both become "First name". */
export function schemaFormHumanize(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .trim()
    .toLowerCase();
  return words ? words[0]?.toUpperCase() + words.slice(1) : key;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Resolves a local `#/$defs/x` or `#/definitions/x` pointer. Anything else is left alone. */
export function schemaFormResolve(node: SchemaFormJson, root: SchemaFormJson, depth = 0): SchemaFormJson {
  if (!node.$ref || depth > 8) return node;
  const match = /^#\/(\$defs|definitions)\/(.+)$/.exec(node.$ref);
  if (!match) return node;
  const target = (root[match[1] as "$defs" | "definitions"] ?? {})[match[2] as string];
  if (!target) return node;
  const { $ref: _ref, ...rest } = node;
  return schemaFormResolve({ ...target, ...rest }, root, depth + 1);
}

function typeOf(node: SchemaFormJson): string | undefined {
  const t = node.type;
  if (Array.isArray(t)) return t.find((x) => x !== "null");
  return t;
}

function textOf(node: SchemaFormJson, key: string, ar: boolean): string {
  const title = ar ? node["x-title-ar"] || node.title : node.title;
  return title || schemaFormHumanize(key.split(".").pop() ?? key);
}

function optionsOf(node: SchemaFormJson, ar: boolean): SchemaOption[] | null {
  if (node.oneOf?.length && node.oneOf.every((o) => o.const !== undefined)) {
    return node.oneOf.map((o) => ({ value: String(o.const), label: (ar ? o["x-title-ar"] || o.title : o.title) ?? String(o.const) }));
  }
  if (node.enum?.length) {
    const titles = (ar ? node["x-enum-titles-ar"] : undefined) ?? node["x-enum-titles"] ?? {};
    return node.enum.map((v) => ({ value: String(v), label: titles[String(v)] ?? (typeof v === "string" ? schemaFormHumanize(v) : String(v)) }));
  }
  return null;
}

/** A field for a scalar schema: text, number, enum, boolean, date, or a foreign key. Null for anything else. */
export function schemaFormLeaf(key: string, raw: SchemaFormJson, root: SchemaFormJson, required: boolean, ar: boolean): { field: SchemaFormField; numeric: boolean } | null {
  const node = schemaFormResolve(raw, root);
  const base = {
    key,
    label: textOf(node, key, ar),
    description: (ar ? node["x-description-ar"] || node.description : node.description) || undefined,
    required: required || undefined,
    width: node["x-width"],
  };
  const relation = node["x-relation"];
  const type = typeOf(node);

  if (relation) {
    return { field: { ...base, type: "text", relation: { resource: relation.resource, multiple: !!relation.multiple || type === "array" } }, numeric: false };
  }

  const opts = optionsOf(node, ar);
  if (opts) {
    const numeric = type === "number" || type === "integer";
    return { field: { ...base, type: "select", options: opts, defaultValue: node.default === undefined ? undefined : String(node.default), placeholder: node["x-placeholder"] }, numeric };
  }

  switch (type) {
    case "string": {
      if (node.format === "date") return { field: { ...base, type: "date", defaultValue: typeof node.default === "string" ? node.default : undefined }, numeric: false };
      const inputType = node.format === "email" ? "email" : node.format === "uri" || node.format === "url" ? "url" : node.format === "tel" || node.format === "phone" ? "tel" : "text";
      return {
        field: {
          ...base,
          type: "text",
          inputType,
          multiline: node["x-widget"] === "textarea" || (node.maxLength ?? 0) > 200 || undefined,
          ltr: inputType !== "text" || node["x-widget"] === "ltr" || undefined,
          placeholder: node["x-placeholder"],
          minLength: node.minLength,
          maxLength: node.maxLength,
          pattern: node.pattern,
          defaultValue: typeof node.default === "string" ? node.default : undefined,
        },
        numeric: false,
      };
    }
    case "number":
    case "integer":
      return {
        field: {
          ...base,
          type: "number",
          integer: type === "integer" || undefined,
          min: node.minimum,
          max: node.maximum,
          step: node.multipleOf,
          unit: node["x-unit"],
          placeholder: node["x-placeholder"],
          defaultValue: typeof node.default === "number" ? node.default : undefined,
        },
        numeric: false,
      };
    case "boolean":
      return { field: { ...base, type: "switch", defaultValue: node.default === true }, numeric: false };
    default:
      return null;
  }
}

function convert(key: string, raw: SchemaFormJson, root: SchemaFormJson, required: boolean, ar: boolean, plan: SchemaFormPlan, depth: number): SchemaFormField | null {
  const node = schemaFormResolve(raw, root);
  const type = typeOf(node);

  if (node["x-relation"]) plan.unsupported = plan.unsupported.filter((u) => u.key !== key);

  if (type === "array" && !node["x-relation"]) {
    const item = node.items ? schemaFormResolve(node.items, root) : undefined;
    if (!item || typeOf(item) !== "object" || !item.properties) {
      plan.unsupported.push({ key, reason: "The flat plan draws arrays of objects, or records with x-relation. SchemaForm itself also draws arrays of plain values." });
      return null;
    }
    const inner = schemaFormFields(item, { locale: ar ? "ar" : "en", root, depth: depth + 1 });
    plan.unsupported.push(...inner.unsupported.map((u) => ({ key: `${key}.${u.key}`, reason: u.reason })));
    return {
      key,
      label: textOf(node, key, ar),
      description: (ar ? node["x-description-ar"] || node.description : node.description) || undefined,
      required: required || undefined,
      width: node["x-width"],
      type: "repeater",
      fields: inner.fields,
      min: node.minItems,
      max: node.maxItems,
      titleKey: node["x-title-key"],
    };
  }

  const leaf = schemaFormLeaf(key, raw, root, required, ar);
  if (!leaf) {
    plan.unsupported.push({ key, reason: `Type "${String(node.type)}" is not supported.` });
    return null;
  }
  if (leaf.numeric) plan.numericEnums.push(key);
  return leaf.field;
}

/**
 * The fields of an object schema, in `x-order` and then schema order. One level of nested object becomes a section:
 * its fields get dotted keys ("address.city") and a `section`. Use `schemaFormOutput` to nest the values again.
 */
export function schemaFormFields(schema: SchemaFormJson, options: { locale?: string; root?: SchemaFormJson; depth?: number } = {}): SchemaFormPlan {
  const ar = (options.locale ?? "en").startsWith("ar");
  const root = options.root ?? schema;
  const depth = options.depth ?? 0;
  const plan: SchemaFormPlan = { fields: [], sections: [], numericEnums: [], unsupported: [] };
  const top = schemaFormResolve(schema, root);
  const props = Object.entries(top.properties ?? {})
    .map(([key, node], index) => ({ key, node, index }))
    .sort((a, b) => (a.node["x-order"] ?? 1e6) - (b.node["x-order"] ?? 1e6) || a.index - b.index);

  for (const { key, node: raw } of props) {
    const node = schemaFormResolve(raw, root);
    if (typeOf(node) === "object" && node.properties && !node["x-relation"]) {
      if (depth > 0) {
        plan.unsupported.push({ key, reason: "Objects nested more than one level deep are not supported." });
        continue;
      }
      plan.sections.push({ id: key, title: textOf(node, key, ar) });
      const nestedRequired = new Set(node.required ?? []);
      for (const [childKey, child] of Object.entries(node.properties)) {
        const field = convert(`${key}.${childKey}`, child, root, nestedRequired.has(childKey), ar, plan, depth);
        if (field) plan.fields.push({ ...field, section: key });
      }
      continue;
    }
    const field = convert(key, raw, root, (top.required ?? []).includes(key), ar, plan, depth);
    if (field) plan.fields.push(field);
  }
  return plan;
}

/** The starting values of a form: defaults for every field, and the given `initial` values on top (dotted keys or nested). */
export function schemaFormInitial(plan: SchemaFormPlan, initial: Record<string, unknown> = {}): Record<string, unknown> {
  const flat = schemaFormFlatten(initial);
  const out: Record<string, unknown> = {};
  for (const field of plan.fields) {
    const given = flat[field.key];
    if (given !== undefined) {
      out[field.key] = field.type === "select" && given !== null ? String(given) : given;
      continue;
    }
    if (field.relation) out[field.key] = field.relation.multiple ? [] : "";
    else if (field.type === "text") out[field.key] = field.defaultValue ?? "";
    else if (field.type === "number") out[field.key] = field.defaultValue ?? null;
    else if (field.type === "select") out[field.key] = field.defaultValue ?? null;
    else if (field.type === "switch") out[field.key] = field.defaultValue ?? false;
    else if (field.type === "date") out[field.key] = field.defaultValue ?? null;
    else out[field.key] = field.defaultValue ?? [];
  }
  return out;
}

/** {a: {b: 1}} becomes {"a.b": 1}. Arrays and one-level objects are flattened; arrays are kept as values. */
export function schemaFormFlatten(value: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isObject(v) && !prefix) Object.assign(out, schemaFormFlatten(v, path));
    else out[path] = v;
  }
  return out;
}

/** The value to submit: dotted keys nested again, empty text left out as null, numeric enums turned back into numbers. */
export function schemaFormOutput(plan: SchemaFormPlan, values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const numeric = new Set(plan.numericEnums);
  for (const field of plan.fields) {
    let v = values[field.key];
    if (field.type === "select" && typeof v === "string" && numeric.has(field.key)) v = Number(v);
    if (field.type === "text" && v === "") v = null;
    if (field.relation && !field.relation.multiple && v === "") v = null;
    const [head, tail] = field.key.split(".");
    if (tail === undefined) out[head as string] = v;
    else {
      const bucket = (out[head as string] ??= {}) as Record<string, unknown>;
      bucket[tail] = v;
    }
  }
  return out;
}
