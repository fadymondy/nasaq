import type { KnowledgeGapStatus } from "./knowledge-gaps-math";

export interface KnowledgeGap {
  id: string;
  /** The question nobody could answer, as it was asked. */
  query: string;
  /** How many times it was asked. */
  hits: number;
  firstSeen: Date | string | number;
  lastSeen: Date | string | number;
  status: KnowledgeGapStatus;
  /** A note on how it was handled, shown in quotes. */
  resolution?: string;
}

export type KnowledgeGapResult = void | { error?: string };
