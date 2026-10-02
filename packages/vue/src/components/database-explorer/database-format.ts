/** Pure helpers for the database explorer: SQL quoting, value formatting and CSV. */

export type CellKind = "null" | "number" | "boolean" | "json" | "date" | "text";

/** How a value should be drawn. Numbers and dates keep their own alignment and font. */
export function cellKind(value: unknown): CellKind {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "bigint") return "number";
  if (typeof value === "boolean") return "boolean";
  if (value instanceof Date) return "date";
  if (typeof value === "object") return "json";
  return "text";
}

/** The text shown for a value. `null` is left to the caller (it draws a NULL chip). */
export function formatCell(value: unknown): string {
  switch (cellKind(value)) {
    case "null":
      return "";
    case "json":
      return JSON.stringify(value);
    case "date":
      return (value as Date).toISOString();
    default:
      return String(value);
  }
}

/** Quote an identifier for standard SQL: `my "table"` becomes `"my ""table"""`. */
export function quoteIdent(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

/** `SELECT * FROM "schema"."table" LIMIT n`. */
export function buildSelectSql(table: string, schema?: string, limit = 100): string {
  const from = schema ? `${quoteIdent(schema)}.${quoteIdent(table)}` : quoteIdent(table);
  return `SELECT * FROM ${from} LIMIT ${Math.max(1, Math.floor(limit))};`;
}

function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = formatCell(value);
  // Spreadsheet formula injection: a leading = + - @ makes Excel run the cell.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** RFC 4180 CSV with a header row. Text that starts with `= + - @` is prefixed with a quote. */
export function resultToCsv(columns: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const lines = [columns.map((c) => csvField(String(c))).join(",")];
  for (const row of rows) lines.push(columns.map((_, i) => csvField(row[i])).join(","));
  return lines.join("\r\n");
}

/** True when the statement starts with SELECT, WITH, EXPLAIN, SHOW, VALUES or DESCRIBE. A soft check to warn before writes, not a security control. */
export function isReadOnlySql(sql: string): boolean {
  const stripped = sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim();
  return /^(select|with|explain|show|values|describe|desc)\b/i.test(stripped);
}

/** Add a query to the front of the history: newest first, no repeats, capped. */
export function pushHistory(history: readonly string[], sql: string, max = 20): string[] {
  const text = sql.trim();
  if (!text) return [...history];
  return [text, ...history.filter((h) => h !== text)].slice(0, max);
}
