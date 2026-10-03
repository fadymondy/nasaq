// Pure .env helpers, copied from packages/web/src/components/env-list/env-list-format.ts (comments kept short).

export interface EnvVariable {
  /** The variable name: letters, digits and underscores, not starting with a digit. */
  key: string;
  value: string;
  /** Secrets are masked until revealed. Default true. */
  secret?: boolean;
  /** A note shown under the key. */
  description?: string;
}

export const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isValidEnvKey(key: string): boolean {
  return ENV_KEY.test(key);
}

export type EnvKeyProblem = "empty" | "invalid" | "duplicate";

/** What is wrong with a key, if anything. `existing` are the other keys already in the list. */
export function checkEnvKey(key: string, existing: Iterable<string>): EnvKeyProblem | null {
  if (key === "") return "empty";
  if (!ENV_KEY.test(key)) return "invalid";
  for (const k of existing) if (k === key) return "duplicate";
  return null;
}

export interface EnvParseIssue {
  /** 1-based line number in the pasted text. */
  line: number;
  problem: "invalid-key" | "no-equals" | "unterminated-quote";
  /** The key that was read, when there was one. Never the value. */
  key?: string;
}

export interface EnvParseResult {
  variables: { key: string; value: string }[];
  /** Keys that appear more than once in the paste. The last value wins. */
  duplicates: string[];
  issues: EnvParseIssue[];
}

const ESCAPES: Record<string, string> = { n: "\n", r: "\r", t: "\t", '"': '"', "\\": "\\", $: "$" };

/**
 * Reads `.env` text: `KEY=value`, `export KEY=value`, quoted values (double quotes understand `\n`), `#`
 * comments, blank lines, and multi-line quoted values. Lines that cannot be read are reported, not thrown.
 */
export function parseEnv(text: string): EnvParseResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const found = new Map<string, string>();
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  const issues: EnvParseIssue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] as string;
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([^=\s]+)\s*=\s*(.*)$/.exec(line);
    if (!m) {
      issues.push({ line: i + 1, problem: "no-equals" });
      continue;
    }
    const key = m[1] as string;
    let rest = (m[2] as string).trimStart();
    let value: string;
    if (rest.startsWith('"') || rest.startsWith("'")) {
      const quote = rest[0] as string;
      let body = rest.slice(1);
      let closed = -1;
      let j = i;
      for (;;) {
        closed = findClosing(body, quote);
        if (closed >= 0 || j + 1 >= lines.length) break;
        j++;
        body += `\n${lines[j] as string}`;
      }
      if (closed < 0) {
        issues.push({ line: i + 1, problem: "unterminated-quote", key });
        continue;
      }
      value = body.slice(0, closed);
      if (quote === '"') value = value.replace(/\\([nrt"\\$])/g, (_, c: string) => ESCAPES[c] as string);
      i = j;
    } else {
      rest = rest.replace(/\s+#.*$/, "").trimEnd();
      value = rest;
    }
    if (!ENV_KEY.test(key)) {
      issues.push({ line: i + 1, problem: "invalid-key", key });
      continue;
    }
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
    found.set(key, value);
  }
  return { variables: [...found].map(([key, value]) => ({ key, value })), duplicates: [...duplicates], issues };
}

function findClosing(body: string, quote: string): number {
  for (let k = 0; k < body.length; k++) {
    if (quote === '"' && body[k] === "\\") {
      k++;
      continue;
    }
    if (body[k] === quote) return k;
  }
  return -1;
}

/** Quotes a value only when it needs it (spaces, `#`, quotes, newlines, `$`, or empty edges). */
export function quoteEnvValue(value: string): string {
  if (value === "") return "";
  if (!/[\s#"'\$`]/.test(value)) return value;
  return `"${value.replace(/[\\"$]/g, "\\$&").replace(/\n/g, "\\n").replace(/\r/g, "\\r")}"`;
}

/** `KEY=value` lines for a list of variables, ready to save as `.env`. */
export function serializeEnv(variables: readonly Pick<EnvVariable, "key" | "value">[]): string {
  return `${variables.map((v) => `${v.key}=${quoteEnvValue(v.value)}`).join("\n")}\n`;
}

/** A fixed-width mask, so the length of a secret is not leaked. */
export const MASK = "\u2022".repeat(12);

/** How many of `incoming` keys already exist in `current`. */
export function conflictingKeys(current: readonly { key: string }[], incoming: readonly { key: string }[]): string[] {
  const have = new Set(current.map((v) => v.key));
  return incoming.filter((v) => have.has(v.key)).map((v) => v.key);
}

/** Prefixes frameworks expose to the browser on purpose: such values are not secrets. */
const PUBLIC_PREFIX = /^(?:NEXT_PUBLIC_|VITE_|PUBLIC_|NUXT_PUBLIC_|EXPO_PUBLIC_|REACT_APP_)/;

/** True when the key is meant to be public (`NEXT_PUBLIC_*`, `VITE_*`), so an import can leave it unmasked. */
export function looksPublic(key: string): boolean {
  return PUBLIC_PREFIX.test(key);
}
