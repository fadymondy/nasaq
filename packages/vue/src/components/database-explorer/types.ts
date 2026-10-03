export interface DatabaseColumn {
  name: string;
  /** The database's own type name: `uuid`, `varchar(120)`, `timestamptz`. */
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  /** `table.column` this column points at. */
  references?: string;
}

export interface DatabaseTable {
  name: string;
  kind?: "table" | "view";
  /** Estimated row count, shown next to the name. */
  rowCount?: number;
  columns: readonly DatabaseColumn[];
}

export interface DatabaseSchema {
  name: string;
  tables: readonly DatabaseTable[];
}

export interface QueryResult {
  columns: readonly string[];
  rows: readonly (readonly unknown[])[];
  durationMs?: number;
  /** For statements that change data and return no rows. */
  affectedRows?: number;
  /** The server cut the rows off at `rows.length`. */
  truncated?: boolean;
}

/** A result, or `{ error }` with a message from the database. */
export type QueryOutcome = QueryResult | { error: string };

export interface TableRef {
  schema: string;
  table: string;
}
