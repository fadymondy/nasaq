/*
 * Pure serializers for the export action: CSV, JSON and XLSX (a stored ZIP of SpreadsheetML, no dependency).
 * Nothing here touches the DOM, so it runs in node and is covered by test/export-action.test.mjs.
 */

export type ExportCell = string | number | boolean | bigint | Date | null | undefined | object;

const encoder = new TextEncoder();

/** One cell as text: null is empty, dates are ISO 8601, objects are JSON. */
export function cellToText(value: ExportCell): string {
  if (value == null) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/* ------------------------------------------------------------------ CSV */

export interface CsvOptions {
  /** Default ",". Use ";" for spreadsheets in locales that use a decimal comma. */
  delimiter?: string;
  /** Default "\r\n" (RFC 4180). */
  newline?: string;
  /** Prefix a UTF-8 byte order mark so Excel reads Arabic correctly. Default false. */
  bom?: boolean;
  /**
   * Prefix text that starts with = + - @ (or a tab / carriage return) with an apostrophe, so a spreadsheet does
   * not run it as a formula (CSV injection). Numbers are never touched. Default true.
   */
  guardFormulas?: boolean;
}

const FORMULA_START = /^[=+\-@\t\r]/;

/** Escapes one CSV field: quotes it when it holds the delimiter, a quote or a line break, and doubles inner quotes. */
export function csvField(value: ExportCell, { delimiter = ",", guardFormulas = true }: Pick<CsvOptions, "delimiter" | "guardFormulas"> = {}): string {
  let text = cellToText(value);
  if (guardFormulas && typeof value === "string" && FORMULA_START.test(text)) text = `'${text}`;
  return text.includes(delimiter) || /["\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Serializes rows (the first is usually the header) to CSV text. No trailing newline. */
export function toCsv(rows: readonly (readonly ExportCell[])[], options: CsvOptions = {}): string {
  const { delimiter = ",", newline = "\r\n", bom = false } = options;
  const body = rows.map((row) => row.map((cell) => csvField(cell, options)).join(delimiter)).join(newline);
  return bom ? `﻿${body}` : body;
}

/* ------------------------------------------------------------------ JSON */

/** Pretty JSON for an array of records. Dates become ISO strings and bigints become strings. */
export function toJson(records: readonly Record<string, unknown>[]): string {
  return JSON.stringify(records, (_key, value) => (typeof value === "bigint" ? value.toString() : value), 2);
}

/* ------------------------------------------------------------------ ZIP (stored) and XLSX */

let crcTable: Uint32Array | undefined;

/** CRC-32 (IEEE), as ZIP needs it. `crc32(utf8("123456789"))` is 0xCBF43926. */
export function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** A ZIP archive with every entry stored (no compression). Enough for an .xlsx, which Excel and Sheets open fine. */
export function zipStore(entries: readonly ZipEntry[], date: Date = new Date()): Uint8Array {
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const dosDate = (Math.max(0, date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBytes = encoder.encode(name);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    locals.push(new Uint8Array(local.buffer), nameBytes, data);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, dosTime, true);
    central.setUint16(14, dosDate, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, data.length, true);
    central.setUint32(24, data.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint32(42, offset, true);
    centrals.push(new Uint8Array(central.buffer), nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const centralSize = centrals.reduce((n, part) => n + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const parts = [...locals, ...centrals, new Uint8Array(end.buffer)];
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** Column letters for a zero-based index: 0 → A, 25 → Z, 26 → AA. */
export function columnLetters(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

const XML_INVALID = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;
const escapeXml = (text: string) =>
  text.replace(XML_INVALID, "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Excel sheet names: at most 31 characters, none of : \ / ? * [ ], not empty. */
export function safeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31);
  return cleaned || "Sheet1";
}

export interface XlsxOptions {
  sheetName?: string;
  /** Lay the sheet out right to left (Arabic). */
  rtl?: boolean;
  /** Bold the first row. Default true. */
  boldHeader?: boolean;
  /** The ZIP timestamp. Set it for reproducible output. */
  date?: Date;
}

function sheetXml(rows: readonly (readonly ExportCell[])[], { rtl = false, boldHeader = true }: XlsxOptions): string {
  const lines: string[] = [];
  rows.forEach((row, r) => {
    const cells: string[] = [];
    row.forEach((value, c) => {
      const ref = `${columnLetters(c)}${r + 1}`;
      const style = boldHeader && r === 0 ? ' s="1"' : "";
      if (value == null || value === "") return;
      if (typeof value === "number" && Number.isFinite(value)) cells.push(`<c r="${ref}"${style}><v>${value}</v></c>`);
      else if (typeof value === "boolean") cells.push(`<c r="${ref}" t="b"${style}><v>${value ? 1 : 0}</v></c>`);
      else cells.push(`<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(cellToText(value))}</t></is></c>`);
    });
    lines.push(`<row r="${r + 1}">${cells.join("")}</row>`);
  });
  const frozen = boldHeader && rows.length > 1 ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : "";
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetViews><sheetView workbookViewId="0"${rtl ? ' rightToLeft="1"' : ""}>${frozen}</sheetView></sheetViews>` +
    `<sheetData>${lines.join("")}</sheetData></worksheet>`
  );
}

/** A one-sheet .xlsx workbook. Numbers and booleans keep their type; everything else is text. */
export function toXlsx(rows: readonly (readonly ExportCell[])[], options: XlsxOptions = {}): Uint8Array {
  const sheetName = escapeXml(safeSheetName(options.sheetName ?? "Sheet1"));
  const xml = (body: string) => encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body}`);
  const entries: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      data: xml(
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          "</Types>",
      ),
    },
    {
      name: "_rels/.rels",
      data: xml(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          "</Relationships>",
      ),
    },
    {
      name: "xl/workbook.xml",
      data: xml(
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          `<sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: xml(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
          '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
          "</Relationships>",
      ),
    },
    {
      name: "xl/styles.xml",
      data: xml(
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
          '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
          '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
          '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
          '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
          '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
          "</styleSheet>",
      ),
    },
    { name: "xl/worksheets/sheet1.xml", data: encoder.encode(sheetXml(rows, options)) },
  ];
  return zipStore(entries, options.date);
}

/* ------------------------------------------------------------------ building a file from rows */

export type ExportFileFormat = "csv" | "xlsx" | "json";

export interface ExportColumnSpec<T> {
  id: string;
  /** The header text (CSV, XLSX) and shown in the column list. */
  label: string;
  /** The cell value for a row. Default: `row[id]`. */
  value?: (row: T) => ExportCell;
}

export const EXPORT_MIME: Record<ExportFileFormat, string> = {
  csv: "text/csv;charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  json: "application/json;charset=utf-8",
};

export interface BuildExportOptions<T> {
  format: ExportFileFormat;
  columns: readonly ExportColumnSpec<T>[];
  rows: readonly T[];
  sheetName?: string;
  rtl?: boolean;
  /** Called with 0..1 as rows are read. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
  /** Rows read between yields to the event loop. Default 500. */
  chunk?: number;
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Reads one cell: the column's `value`, else `row[id]`. */
export function readCell<T>(column: ExportColumnSpec<T>, row: T): ExportCell {
  if (column.value) return column.value(row);
  return (row as Record<string, ExportCell>)?.[column.id];
}

/**
 * Turns rows into file bytes in the chosen format. Reads rows in chunks and yields between them, so a long
 * export keeps the page responsive, reports progress and can be cancelled through `signal`.
 */
export async function buildExportFile<T>({ format, columns, rows, sheetName, rtl, onProgress, signal, chunk = 500 }: BuildExportOptions<T>): Promise<Uint8Array> {
  const matrix: ExportCell[][] = [];
  const total = Math.max(1, rows.length);
  for (let i = 0; i < rows.length; i += chunk) {
    if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
    for (const row of rows.slice(i, i + chunk)) matrix.push(columns.map((c) => readCell(c, row)));
    onProgress?.(Math.min(0.9, (Math.min(i + chunk, rows.length) / total) * 0.9));
    if (rows.length > chunk) await tick();
  }
  if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
  let bytes: Uint8Array;
  if (format === "csv") {
    bytes = encoder.encode(toCsv([columns.map((c) => c.label), ...matrix], { bom: true }));
  } else if (format === "json") {
    const records = matrix.map((cells) => Object.fromEntries(columns.map((c, i) => [c.id, cells[i] ?? null])));
    bytes = encoder.encode(toJson(records));
  } else {
    bytes = toXlsx([columns.map((c) => c.label), ...matrix], { sheetName, rtl });
  }
  onProgress?.(1);
  return bytes;
}
