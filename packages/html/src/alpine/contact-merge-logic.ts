/* Pure helpers for merging duplicate contacts: which value survives per field. No Vue. Same as the React logic. */

export type ContactMergeValue = string | readonly string[] | null | undefined;

export interface ContactMergeField {
  id: string;
  label: string;
  /** A list (tags, segments). By default every record's entries are combined; the user can still pick one record's list. */
  multi?: boolean;
  /** Emails, phone numbers and codes read left to right, also in Arabic. */
  ltr?: boolean;
}

export interface ContactMergeValues {
  id: string;
  values: Readonly<Record<string, ContactMergeValue>>;
}

/** The choice for a field is a record id, or `"all"` to combine a list field. */
export const CONTACT_MERGE_ALL = "all";
export type ContactMergeChoices = Record<string, string>;

export function isEmptyMergeValue(value: ContactMergeValue): boolean {
  if (value == null) return true;
  return typeof value === "string" ? value.trim() === "" : value.length === 0;
}

const same = (a: ContactMergeValue, b: ContactMergeValue) => {
  if (typeof a === "string" || typeof b === "string") return typeof a === "string" && typeof b === "string" && a.trim() === b.trim();
  return JSON.stringify([...(a ?? [])].sort()) === JSON.stringify([...(b ?? [])].sort());
};

/** Whether at least two records hold different, non-empty values for the field, so the user has to choose. */
export function contactMergeConflict(field: ContactMergeField, records: readonly ContactMergeValues[]): boolean {
  const filled = records.map((r) => r.values[field.id]).filter((v) => !isEmptyMergeValue(v));
  return filled.some((v) => !same(v, filled[0]));
}

/** Union of the entries of a list field, in order of first appearance. */
export function combineMergeLists(values: readonly ContactMergeValue[]): string[] {
  const seen = new Set<string>();
  for (const v of values) for (const item of typeof v === "string" ? [v] : (v ?? [])) seen.add(item);
  return [...seen];
}

/**
 * The starting choice for every field: lists are combined, and any other field keeps the survivor's value, falling
 * back to the first record that has one. The user only has to look at the fields that really differ.
 */
export function defaultContactMergeChoices(fields: readonly ContactMergeField[], records: readonly ContactMergeValues[], survivorId: string): ContactMergeChoices {
  const choices: ContactMergeChoices = {};
  const survivor = records.find((r) => r.id === survivorId) ?? records[0];
  for (const field of fields) {
    if (field.multi) {
      choices[field.id] = CONTACT_MERGE_ALL;
      continue;
    }
    const owner = !isEmptyMergeValue(survivor?.values[field.id]) ? survivor : records.find((r) => !isEmptyMergeValue(r.values[field.id]));
    choices[field.id] = (owner ?? survivor)?.id ?? "";
  }
  return choices;
}

/** The value a field ends up with for the given choice. */
export function resolveContactMergeValue(field: ContactMergeField, records: readonly ContactMergeValues[], choice: string | undefined): ContactMergeValue {
  if (field.multi && (choice === CONTACT_MERGE_ALL || choice === undefined)) return combineMergeLists(records.map((r) => r.values[field.id]));
  const record = records.find((r) => r.id === choice);
  const value = record?.values[field.id];
  return field.multi && typeof value === "string" ? [value] : value;
}

export interface ContactMergeOutcome {
  /** The record that stays. */
  survivorId: string;
  /** The records folded into it and deleted. */
  mergedIds: string[];
  values: Record<string, ContactMergeValue>;
  choices: ContactMergeChoices;
}

export function resolveContactMerge(fields: readonly ContactMergeField[], records: readonly ContactMergeValues[], survivorId: string, choices: ContactMergeChoices): ContactMergeOutcome {
  const values: Record<string, ContactMergeValue> = {};
  for (const field of fields) values[field.id] = resolveContactMergeValue(field, records, choices[field.id]);
  return { survivorId, mergedIds: records.filter((r) => r.id !== survivorId).map((r) => r.id), values, choices: { ...choices } };
}

/** Switching the survivor moves every field that still holds the old default to the new survivor. */
export function rebaseContactMergeChoices(
  fields: readonly ContactMergeField[],
  records: readonly ContactMergeValues[],
  previous: ContactMergeChoices,
  previousSurvivorId: string,
  survivorId: string,
): ContactMergeChoices {
  const before = defaultContactMergeChoices(fields, records, previousSurvivorId);
  const after = defaultContactMergeChoices(fields, records, survivorId);
  const next: ContactMergeChoices = {};
  for (const field of fields) next[field.id] = previous[field.id] === before[field.id] ? (after[field.id] ?? "") : (previous[field.id] ?? "");
  return next;
}
