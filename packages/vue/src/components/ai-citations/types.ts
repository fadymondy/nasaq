/** One thing an answer can point at. `snippet` is used as the excerpt when there is no `quote`. */
export interface AiCitationSource {
  id: string;
  title: string;
  /** Only http(s) links become clickable. */
  url?: string;
  /** The passage the answer relied on. */
  quote?: string;
  snippet?: string;
  /** Where in the source: "p. 4", "section 2.1", "00:14:30". Kept left to right. */
  locator?: string;
  /** Free kind such as "PDF", "Web", "Ticket". Shown as a small badge. */
  kind?: string;
  /** How relevant the passage was, 0 to 1. */
  score?: number;
  /** Words inside the quote to mark, e.g. the ones the answer used. */
  highlight?: string | readonly string[];
}

export interface AiProvenanceInfo {
  /** Model name, kept left to right. */
  model?: string;
  latencyMs?: number;
  /** Whether the answer was built from retrieved sources. */
  grounded?: boolean;
  /** How many sources it used. Shown when grounded. */
  sourceCount?: number;
  tokens?: { input?: number; output?: number };
  /** Passages the retriever returned before ranking. */
  retrieved?: number;
  at?: Date | number | string;
  /** 0 to 1. */
  confidence?: number;
  /** Extra rows, for example `{ label: "Index", value: "docs-v3" }`. */
  extra?: readonly { label: string; value: string }[];
}
