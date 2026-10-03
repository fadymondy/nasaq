import { inject, type InjectionKey } from "vue";
import type { RelationOption } from "../relation-picker/types";
import type { SchemaFormStrings } from "./schema-strings";
import type { SchemaFormMessages, SchemaTreeState } from "./schema-tree";

/** How a relation resource is searched. The same shape as NqRelationPicker's data props. */
export interface SchemaFormRelationSource {
  search?: (query: string, signal: AbortSignal) => Promise<readonly RelationOption[]>;
  options?: readonly RelationOption[];
  resolve?: (ids: readonly string[]) => Promise<readonly RelationOption[]>;
  onCreate?: (query: string) => Promise<RelationOption | { error: string }>;
  debounce?: number;
}

export interface SchemaFormSubmitResult {
  /** A message for the whole form. */
  error?: string;
  /** Server-side errors by field path ("email", "address.city", "contacts[1].phone"). */
  fieldErrors?: Record<string, string>;
}
/** Every string the form shows. Override any of them, for another language or wording. */
export type SchemaFormLabels = Partial<SchemaFormStrings>;

/** Everything the nodes need from the form, in one place so nested fields do not thread props. */
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

export const SCHEMA_FORM: InjectionKey<SchemaFormContext> = Symbol("nq-schema-form");
export function useSchemaForm(): SchemaFormContext {
  const ctx = inject(SCHEMA_FORM, null);
  if (!ctx) throw new Error("Schema form nodes must render inside <NqSchemaForm>.");
  return ctx;
}

export const schemaFormIsoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const schemaFormDateOf = (iso: unknown): Date | null => {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};
export const schemaFormChild = (path: string, key: string) => (path ? `${path}.${key}` : key);
export const schemaFormIsRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
