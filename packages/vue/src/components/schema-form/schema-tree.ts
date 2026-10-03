/*
 * The tree behind SchemaForm: a JSON Schema of any depth turned into objects, lists and fields, with the pure
 * functions that work on it: defaults, initial values, output, validation, show/hide/require rules, server errors
 * and titles of list items. No React, so it runs on the server and in node tests. Paths are written
 * "address.city" and "contacts[1].phones[0]" (see schema-path.ts).
 */
import type { RuleCondition, RuleGroup } from "../rule-builder/rule-model";
import { formFieldStates, type FormFieldDef, type FormRule, type FormValues } from "../public-form/form-model";
import { SCHEMA_MESSAGES, type SchemaMessages, validateField } from "../schema-repeater/schema";
import { type SchemaFormField, type SchemaFormJson, schemaFormLeaf, schemaFormResolve } from "./schema-fields";
import { schemaPathFormat, schemaPathGet, schemaPathParse, schemaPathResolve, type SchemaPathSegment, schemaPathMatches } from "./schema-path";

/* ------------------------------------------------------------------ types */

interface TreeBase {
  /** The key inside its parent object. "item" for the items of a list. */
  key: string;
  /** The path pattern: "contacts[].phones[]". */
  path: string;
  label: string;
  description?: string;
  required: boolean;
  width?: "half" | "full";
}

export interface SchemaTreeLeaf extends TreeBase {
  kind: "field";
  field: SchemaFormField;
  /** An enum of numbers: the value is a string in the form and a number in the output. */
  numeric: boolean;
}

export interface SchemaTreeObject extends TreeBase {
  kind: "object";
  children: SchemaTreeNode[];
}

/** How a list is drawn: tags (strings), a checkbox group (enum with uniqueItems), repeated inputs, or groups of fields. */
export type SchemaTreeListMode = "tags" | "checkboxes" | "items" | "groups";

export interface SchemaTreeList extends TreeBase {
  kind: "list";
  mode: SchemaTreeListMode;
  item: SchemaTreeLeaf | SchemaTreeObject;
  /** The name of one item: the `title` of `items`, else the list's label. */
  itemLabel: string;
  min?: number;
  max?: number;
  unique: boolean;
  /** `x-title` (or `x-title-key`): a property key or a "{name} - {role}" template that titles each group. */
  titleSpec?: string;
  /** The schema `default`, when it is an array. */
  initial?: unknown[];
}

export type SchemaTreeNode = SchemaTreeLeaf | SchemaTreeObject | SchemaTreeList;

export interface SchemaFormTree {
  root: SchemaTreeObject;
  /** What could not become a field, by path, so a caller can warn. */
  unsupported: { key: string; reason: string }[];
}

/* ------------------------------------------------------------------ building */

const MAX_DEPTH = 12;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function typeOf(node: SchemaFormJson): string | undefined {
  const t = node.type;
  return Array.isArray(t) ? t.find((x) => x !== "null") : t;
}

function titleOf(node: SchemaFormJson, fallback: string, ar: boolean): string {
  return (ar ? node["x-title-ar"] || node.title : node.title) || fallback;
}

function humanize(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .trim()
    .toLowerCase();
  return words ? (words[0] as string).toUpperCase() + words.slice(1) : key;
}

interface Ctx {
  root: SchemaFormJson;
  ar: boolean;
  unsupported: { key: string; reason: string }[];
}

function buildChildren(node: SchemaFormJson, parentPath: string, ctx: Ctx, depth: number): SchemaTreeNode[] {
  const required = new Set(node.required ?? []);
  const props = Object.entries(node.properties ?? {})
    .map(([key, raw], index) => ({ key, raw, index }))
    .sort((a, b) => (a.raw["x-order"] ?? 1e6) - (b.raw["x-order"] ?? 1e6) || a.index - b.index);
  const out: SchemaTreeNode[] = [];
  for (const { key, raw } of props) {
    const child = buildNode(key, raw, parentPath ? `${parentPath}.${key}` : key, required.has(key), ctx, depth);
    if (child) out.push(child);
  }
  return out;
}

function buildObject(key: string, node: SchemaFormJson, path: string, required: boolean, ctx: Ctx, depth: number): SchemaTreeObject {
  return {
    kind: "object",
    key,
    path,
    label: titleOf(node, humanize(key), ctx.ar),
    description: (ctx.ar ? node["x-description-ar"] || node.description : node.description) || undefined,
    required,
    width: node["x-width"],
    children: buildChildren(node, path, ctx, depth + 1),
  };
}

function buildNode(key: string, raw: SchemaFormJson, path: string, required: boolean, ctx: Ctx, depth: number): SchemaTreeNode | null {
  const node = schemaFormResolve(raw, ctx.root);
  if (depth > MAX_DEPTH) {
    ctx.unsupported.push({ key: path, reason: "Nested too deep." });
    return null;
  }
  const type = typeOf(node);
  if (!node["x-relation"]) {
    if (type === "object" && node.properties) return buildObject(key, node, path, required, ctx, depth);
    if (type === "array" && !node.enum) return buildList(key, node, path, required, ctx, depth);
  }
  const leaf = schemaFormLeaf(key, raw, ctx.root, required, ctx.ar);
  if (!leaf) {
    ctx.unsupported.push({ key: path, reason: `Type "${String(node.type)}" is not supported.` });
    return null;
  }
  return { kind: "field", key, path, label: leaf.field.label, description: leaf.field.description, required, width: leaf.field.width, field: leaf.field, numeric: leaf.numeric };
}

function buildList(key: string, node: SchemaFormJson, path: string, required: boolean, ctx: Ctx, depth: number): SchemaTreeList | null {
  const itemRaw = node.items;
  const item = itemRaw ? schemaFormResolve(itemRaw, ctx.root) : undefined;
  if (!itemRaw || !item) {
    ctx.unsupported.push({ key: path, reason: "An array needs `items`." });
    return null;
  }
  const label = titleOf(node, humanize(key), ctx.ar);
  const itemLabel = (ctx.ar ? item["x-title-ar"] || item.title : item.title) || label;
  const itemPath = `${path}[]`;
  const base = {
    kind: "list" as const,
    key,
    path,
    label,
    description: (ctx.ar ? node["x-description-ar"] || node.description : node.description) || undefined,
    required,
    width: node["x-width"],
    itemLabel,
    min: node.minItems,
    max: node.maxItems,
    unique: node.uniqueItems === true,
    titleSpec: item["x-title"] ?? node["x-title"] ?? node["x-title-key"],
    initial: Array.isArray(node.default) ? node.default : undefined,
  };

  if (typeOf(item) === "object" && item.properties && !item["x-relation"]) {
    const obj: SchemaTreeObject = { ...buildObject("item", item, itemPath, false, ctx, depth + 1), label: itemLabel };
    return { ...base, mode: "groups", item: obj };
  }

  const leaf = itemRaw && typeOf(item) !== "array" ? schemaFormLeaf("item", itemRaw, ctx.root, true, ctx.ar) : null;
  if (!leaf) {
    ctx.unsupported.push({ key: path, reason: "Arrays are supported when they hold objects or plain values (string, number, enum, boolean, date)." });
    return null;
  }
  const field: SchemaFormField = { ...leaf.field, label: itemLabel, required: true };
  const node2: SchemaTreeLeaf = { kind: "field", key: "item", path: itemPath, label: itemLabel, required: true, field, numeric: leaf.numeric };
  let mode: SchemaTreeListMode = "items";
  if (field.type === "select" && base.unique) mode = "checkboxes";
  else if (field.type === "text" && !field.relation && !field.multiline) mode = "tags";
  return { ...base, mode, item: node2 };
}

/** Builds the tree of an object schema. Locale picks `x-title-ar` and the Arabic option titles. */
export function schemaFormTree(schema: SchemaFormJson, options: { locale?: string } = {}): SchemaFormTree {
  const ar = (options.locale ?? "en").startsWith("ar");
  const top = schemaFormResolve(schema, schema);
  const ctx: Ctx = { root: schema, ar, unsupported: [] };
  const root: SchemaTreeObject = {
    kind: "object",
    key: "",
    path: "",
    label: titleOf(top, "", ar),
    required: true,
    children: buildChildren(top, "", ctx, 0),
  };
  return { root, unsupported: ctx.unsupported };
}

/** Fields and lists first, then nested objects: how SchemaForm lays out (and validates) the children of an object. */
export function schemaFormOrdered(children: readonly SchemaTreeNode[]): { loose: SchemaTreeNode[]; objects: SchemaTreeObject[] } {
  return {
    loose: children.filter((c) => c.kind !== "object"),
    objects: children.filter((c): c is SchemaTreeObject => c.kind === "object"),
  };
}

function ordered(children: readonly SchemaTreeNode[]): SchemaTreeNode[] {
  const { loose, objects } = schemaFormOrdered(children);
  return [...loose, ...objects];
}

/* ------------------------------------------------------------------ values */

/** The default value of a node: "" for text, null for numbers, selects and dates, false for switches, [] for lists. */
export function schemaFormTreeDefaults(node: SchemaTreeNode): unknown {
  switch (node.kind) {
    case "field": {
      const f = node.field;
      if (f.relation) return f.relation.multiple ? [] : "";
      if (f.type === "text") return f.defaultValue ?? "";
      if (f.type === "switch") return f.defaultValue ?? false;
      if (f.type === "number" || f.type === "select" || f.type === "date") return f.defaultValue ?? null;
      return null;
    }
    case "object": {
      const out: Record<string, unknown> = {};
      for (const child of node.children) out[child.key] = schemaFormTreeDefaults(child);
      return out;
    }
    case "list":
      return node.initial ? node.initial.map((x) => schemaFormTreeInitial(node.item, x)) : [];
  }
}

/** The form value for a node: `given` (in the shape of the schema) on top of the defaults. Unknown keys are dropped. */
export function schemaFormTreeInitial(node: SchemaTreeNode, given: unknown): unknown {
  if (given === undefined) return schemaFormTreeDefaults(node);
  switch (node.kind) {
    case "field": {
      const f = node.field;
      if (f.relation) return f.relation.multiple ? (Array.isArray(given) ? given.map(String) : []) : given === null ? "" : String(given);
      if (f.type === "text") return given === null ? "" : String(given);
      if (f.type === "select") return given === null ? null : String(given);
      if (f.type === "number") return typeof given === "number" && Number.isFinite(given) ? given : null;
      if (f.type === "switch") return given === true;
      return typeof given === "string" ? given : null;
    }
    case "object": {
      const source = isRecord(given) ? given : {};
      const out: Record<string, unknown> = {};
      for (const child of node.children) out[child.key] = schemaFormTreeInitial(child, source[child.key]);
      return out;
    }
    case "list": {
      if (!Array.isArray(given)) return schemaFormTreeDefaults(node);
      return given.map((x) => schemaFormTreeInitial(node.item, x));
    }
  }
}

/**
 * The value to submit: numeric enums back to numbers, empty text and empty single relations as null. `visible` (by
 * concrete path) leaves out hidden fields, and hidden list items.
 */
export function schemaFormTreeOutput(node: SchemaTreeNode, value: unknown, options: { visible?: (path: string) => boolean } = {}, path = ""): unknown {
  const visible = options.visible ?? (() => true);
  switch (node.kind) {
    case "field": {
      const f = node.field;
      if (f.type === "select" && node.numeric && typeof value === "string" && value !== "") return Number(value);
      if (f.type === "text" && !f.relation && value === "") return null;
      if (f.relation && !f.relation.multiple && value === "") return null;
      return value === undefined ? null : value;
    }
    case "object": {
      const source = isRecord(value) ? value : {};
      const out: Record<string, unknown> = {};
      for (const child of node.children) {
        const childPath = path ? `${path}.${child.key}` : child.key;
        if (!visible(childPath)) continue;
        out[child.key] = schemaFormTreeOutput(child, source[child.key], options, childPath);
      }
      return out;
    }
    case "list": {
      const items = Array.isArray(value) ? value : [];
      const out: unknown[] = [];
      items.forEach((item, index) => {
        const itemPath = `${path}[${index}]`;
        if (visible(itemPath)) out.push(schemaFormTreeOutput(node.item, item, options, itemPath));
      });
      return out;
    }
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => sameValue(x, b[i]));
  if (isRecord(a) && isRecord(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) if (!sameValue(a[k], b[k])) return false;
    return true;
  }
  return false;
}

/** Whether a value differs from the defaults: a list item with data asks before it is removed. */
export function schemaFormTreeHasData(node: SchemaTreeNode, value: unknown): boolean {
  return !sameValue(value, schemaFormTreeDefaults(node));
}

/* ------------------------------------------------------------------ list items */

/** A leaf's value as text: the option title of a select, the number with its unit. Empty when nothing is filled in. */
function leafText(leaf: SchemaTreeLeaf, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const f = leaf.field;
  if (f.type === "select") return f.options.find((o) => o.value === value)?.label ?? String(value);
  if (f.type === "number" && typeof value === "number") return f.unit ? `${value} ${f.unit}` : String(value);
  if (f.type === "switch") return "";
  return String(value);
}

/**
 * What titles an item of a list of groups: the `x-title` property (or template "{name} - {role}"), else the first
 * text field with a value, else "Contact 2". `keys` are the properties the title used, so a summary can skip them.
 */
export function schemaFormItemTitle(list: SchemaTreeList, value: unknown, index: number, formatIndex: (n: number) => string = String): { title: string; keys: string[] } {
  const fallback = `${list.itemLabel} ${formatIndex(index + 1)}`;
  if (list.mode !== "groups" || list.item.kind !== "object") return { title: fallback, keys: [] };
  const children = list.item.children;
  const find = (key: string) => children.find((c): c is SchemaTreeLeaf => c.kind === "field" && c.key === key);
  const spec = list.titleSpec;
  if (spec?.includes("{")) {
    const keys: string[] = [];
    let filled = false;
    const text = spec.replace(/\{([^{}]+)\}/g, (_m, key: string) => {
      const leaf = find(key.trim());
      const part = leaf ? leafText(leaf, schemaPathGet(value, leaf.key)) : String(schemaPathGet(value, key.trim(), "") ?? "");
      if (part) filled = true;
      keys.push(key.trim());
      return part;
    });
    if (filled && text.trim()) return { title: text.replace(/\s+/g, " ").trim(), keys };
  } else if (spec) {
    const leaf = find(spec);
    const text = leaf ? leafText(leaf, schemaPathGet(value, spec)) : String(schemaPathGet(value, spec, "") ?? "");
    if (text.trim()) return { title: text.trim(), keys: [spec] };
  }
  if (!spec) {
    for (const child of children) {
      if (child.kind !== "field" || child.field.type !== "text" || child.field.relation) continue;
      const text = leafText(child, schemaPathGet(value, child.key));
      if (text.trim()) return { title: text.trim(), keys: [child.key] };
    }
  }
  return { title: fallback, keys: [] };
}

/** A short line for a collapsed item: its first filled values that are not in the title. */
export function schemaFormItemSummary(list: SchemaTreeList, value: unknown, skip: readonly string[], max = 3): string {
  if (list.mode !== "groups" || list.item.kind !== "object") return "";
  const parts: string[] = [];
  for (const child of list.item.children) {
    if (parts.length >= max) break;
    if (child.kind !== "field" || skip.includes(child.key)) continue;
    const text = leafText(child, schemaPathGet(value, child.key));
    if (text) parts.push(text);
  }
  return parts.join(" · ");
}

/* ------------------------------------------------------------------ validation */

export interface SchemaFormMessages extends SchemaMessages {
  unique: (label: string) => string;
}

export const SCHEMA_FORM_MESSAGES: { en: SchemaFormMessages; ar: SchemaFormMessages } = {
  en: { ...SCHEMA_MESSAGES.en, unique: (l) => `${l} cannot have the same value twice.` },
  ar: { ...SCHEMA_MESSAGES.ar, unique: (l) => `${l} لا يمكن أن يتضمن القيمة نفسها مرتين.` },
};

export interface SchemaTreeState {
  visible: boolean;
  required: boolean;
}

export interface SchemaTreeValidateOptions {
  messages?: SchemaFormMessages;
  /** From `schemaFormTreeStates`: hidden nodes are skipped, and a rule can make a node required. */
  states?: Record<string, SchemaTreeState>;
  formatDate?: (iso: string) => string;
  /** How "Phone 2" writes the number. */
  formatIndex?: (n: number) => string;
}

const hasDuplicates = (items: readonly unknown[]): boolean => {
  const seen = new Set<string>();
  for (const item of items) {
    if (item === null || item === undefined || item === "") continue;
    const key = typeof item === "string" ? item.trim() : JSON.stringify(item);
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
};

/**
 * Every problem in a form value, by concrete path: `{ "contacts[1].phone": "Phone is required." }`. A list reports
 * `minItems`, `maxItems` and `uniqueItems` at its own path; its items report at `path[i]`. The first entry is
 * the first field on screen. Run it again on the server.
 */
export function schemaFormTreeValidate(root: SchemaTreeObject, values: unknown, options: SchemaTreeValidateOptions = {}): Record<string, string> {
  const messages = options.messages ?? SCHEMA_FORM_MESSAGES.en;
  const states = options.states ?? {};
  const formatIndex = options.formatIndex ?? String;
  const issues: Record<string, string> = {};

  const visit = (node: SchemaTreeNode, value: unknown, path: string, label?: string) => {
    if (states[path]?.visible === false) return;
    const required = states[path]?.required ?? node.required;
    switch (node.kind) {
      case "field": {
        const f = node.field;
        let v = value;
        if (f.relation?.multiple) v = Array.isArray(value) && value.length ? "x" : "";
        const field = { ...f, required: required || undefined, label: label ?? f.label } as SchemaFormField;
        const message = validateField(field, v, {}, messages, options.formatDate);
        if (message) issues[path] = message;
        return;
      }
      case "object": {
        const source = isRecord(value) ? value : {};
        for (const child of ordered(node.children)) visit(child, source[child.key], path ? `${path}.${child.key}` : child.key);
        return;
      }
      case "list": {
        const items = Array.isArray(value) ? value : [];
        const min = Math.max(node.min ?? 0, required ? 1 : 0);
        if (items.length < min) issues[path] = messages.minRows(node.label, min);
        else if (node.max !== undefined && items.length > node.max) issues[path] = messages.maxRows(node.label, node.max);
        else if (node.unique && hasDuplicates(items)) issues[path] = messages.unique(node.label);
        if (node.mode === "tags" || node.mode === "checkboxes") {
          // Tags are validated one by one, but they live in a single control: report on the list.
          if (!issues[path]) {
            for (let i = 0; i < items.length; i += 1) {
              const leaf = node.item as SchemaTreeLeaf;
              const message = validateField({ ...leaf.field, required: true, label: node.label }, items[i], {}, messages, options.formatDate);
              if (message) {
                issues[path] = message;
                break;
              }
            }
          }
          return;
        }
        items.forEach((item, i) => visit(node.item, item, `${path}[${i}]`, node.item.kind === "field" ? `${node.itemLabel} ${formatIndex(i + 1)}` : undefined));
        return;
      }
    }
  };

  visit(root, values, "");
  return issues;
}

/* ------------------------------------------------------------------ rules */

interface Entry {
  path: string;
  parent: string | null;
  def: FormFieldDef;
  view: string | boolean;
}

function viewOf(value: unknown): string | boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.length ? "1" : "";
  return typeof value === "string" ? value : "";
}

function entries(root: SchemaTreeObject, values: unknown): Entry[] {
  const out: Entry[] = [];
  const visit = (node: SchemaTreeNode, value: unknown, path: string, parent: string | null) => {
    if (path) {
      const kind = node.kind === "field" ? (node.field.type === "switch" ? "checkbox" : node.field.type === "number" ? "number" : node.field.type === "select" ? "select" : "text") : "text";
      out.push({ path, parent, def: { id: path, kind, label: node.label, required: node.required }, view: node.kind === "field" || node.kind === "list" ? viewOf(value) : "" });
    }
    if (node.kind === "object") {
      const source = isRecord(value) ? value : {};
      for (const child of node.children) visit(child, source[child.key], path ? `${path}.${child.key}` : child.key, path || null);
    } else if (node.kind === "list") {
      (Array.isArray(value) ? value : []).forEach((item, i) => visit(node.item, item, `${path}[${i}]`, path));
    }
  };
  visit(root, values, "", null);
  return out;
}

const mapGroup = (group: RuleGroup, fn: (field: string) => string): RuleGroup => ({
  ...group,
  children: group.children.map((n) => (n.kind === "group" ? mapGroup(n, fn) : ({ ...n, field: fn(n.field) } as RuleCondition))),
});

/**
 * Rules speak of fields by path. A target can be a concrete path ("contacts[1].phone"), a pattern ("contacts[].phone",
 * every item) or a plain path. A condition's field can be absolute, relative to the target ("./type" is a sibling,
 * "../type" a sibling of the enclosing object or item) or a pattern ("contacts[].type", which reads the same item as
 * the target). This turns one rule into one rule per concrete target, with the conditions resolved.
 */
export function schemaFormExpandRules(rules: readonly FormRule[], paths: readonly string[]): FormRule[] {
  const out: FormRule[] = [];
  for (const rule of rules) {
    for (const action of rule.actions) {
      const target = String(action.config?.target ?? "");
      if (!target) continue;
      for (const path of paths) {
        if (!schemaPathMatches(target, path)) continue;
        out.push({
          ...rule,
          conditions: mapGroup(rule.conditions, (field) => schemaPathResolve(field, path)),
          actions: [{ ...action, config: { ...action.config, target: path } }],
        });
      }
    }
  }
  return out;
}

/**
 * Which fields show, and which are required, after the rules. Keyed by concrete path; a hidden object or list item hides
 * everything inside it. Without rules, every node is visible and follows the schema's `required`.
 */
export function schemaFormTreeStates(root: SchemaTreeObject, values: unknown, rules: readonly FormRule[] | undefined): Record<string, SchemaTreeState> {
  const list = entries(root, values);
  const own = rules?.length
    ? formFieldStates(
        { fields: list.map((e) => e.def), rules: schemaFormExpandRules(rules, list.map((e) => e.path)) },
        Object.fromEntries(list.map((e) => [e.path, e.view])) as FormValues,
      )
    : {};
  const out: Record<string, SchemaTreeState> = {};
  for (const e of list) {
    const state = own[e.path] ?? { visible: true, required: Boolean(e.def.required) };
    const parentVisible = e.parent === null ? true : (out[e.parent]?.visible ?? true);
    const visible = state.visible && parentVisible;
    out[e.path] = { visible, required: visible && state.required };
  }
  return out;
}

/* ------------------------------------------------------------------ server errors */

export interface SchemaTreeErrorMap {
  /** Messages by the concrete path of the field (or list, or object) that shows them. */
  fields: Record<string, string>;
  /** Errors whose path leads nowhere in the form, to show for the whole form. */
  unmatched: { path: string; message: string }[];
}

/**
 * Maps server errors to fields. A key can be "contacts[1].phone", "contacts.1.phone" or the JSON pointer
 * "/contacts/1/phone". A path that only partly exists (a removed item, an unknown key) lands on the deepest field that
 * does; one that matches nothing is returned in `unmatched`.
 */
export function schemaFormMapErrors(root: SchemaTreeObject, values: unknown, errors: Record<string, string> | undefined): SchemaTreeErrorMap {
  const result: SchemaTreeErrorMap = { fields: {}, unmatched: [] };
  for (const [key, message] of Object.entries(errors ?? {})) {
    if (!message) continue;
    const segments = schemaPathParse(key);
    let node: SchemaTreeNode = root;
    let value: unknown = values;
    const concrete: SchemaPathSegment[] = [];
    for (let i = 0; i < segments.length; i += 1) {
      const seg = segments[i];
      if (node.kind === "object" && typeof seg === "string") {
        const child: SchemaTreeNode | undefined = node.children.find((c) => c.key === seg);
        if (!child) break;
        node = child;
        value = isRecord(value) ? value[seg] : undefined;
        concrete.push(seg);
      } else if (node.kind === "list" && typeof seg === "number" && node.mode !== "tags" && node.mode !== "checkboxes") {
        if (!Array.isArray(value) || seg >= value.length) break;
        value = value[seg];
        node = node.item;
        concrete.push(seg);
      } else break;
    }
    if (concrete.length === 0) result.unmatched.push({ path: key, message });
    else {
      const path = schemaPathFormat(concrete);
      if (!(path in result.fields)) result.fields[path] = message;
    }
  }
  return result;
}

/** "Contact 2 › Phones › Phone 1": where a path is, in words. Used by the validation summary. */
export function schemaFormPathLabel(root: SchemaTreeObject, path: string, formatIndex: (n: number) => string = String): string {
  const parts: string[] = [];
  let node: SchemaTreeNode = root;
  for (const seg of schemaPathParse(path)) {
    if (node.kind === "object" && typeof seg === "string") {
      const child: SchemaTreeNode | undefined = node.children.find((c) => c.key === seg);
      if (!child) break;
      node = child;
      parts.push(child.label);
    } else if (node.kind === "list" && typeof seg === "number") {
      parts.pop();
      parts.push(`${node.itemLabel} ${formatIndex(seg + 1)}`);
      node = node.item;
    } else break;
  }
  return parts.join(" › ");
}
