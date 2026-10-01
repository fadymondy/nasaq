export interface SemanticHit {
  id: string;
  /** The retrieved text. */
  content: string;
  /** Similarity from 0 to 1. */
  score: number;
  /** A collection or network the hit lives in. Shown left-to-right. */
  group?: string;
  /** What kind of memory it is: fact, note, document. */
  kind?: string;
  /** Where it came from: `slack`, `notion`, `upload`. */
  source?: string;
  /** The exact place in that source: a page, a file name. */
  sourceRef?: string;
  /** 0 to 1. */
  importance?: number;
  /** The entity the search went through to find this hit. */
  viaEntity?: string;
}

export interface SemanticSearchOptions {
  mode: string;
  limit: number;
}
