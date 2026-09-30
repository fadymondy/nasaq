export type ErrorPageKind = "not-found" | "server-error" | "offline" | "maintenance" | "forbidden" | "unknown-workspace" | "coming-soon";

const KIND_CODE: Partial<Record<ErrorPageKind, string>> = { "not-found": "404", "server-error": "500", forbidden: "403", maintenance: "503" };

/** The default status code shown for a kind. Only HTTP-like kinds have one, and it stays Latin so it can be quoted. */
export function statusCodeFor(kind: ErrorPageKind): string | undefined {
  return KIND_CODE[kind];
}
