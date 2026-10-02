import type { ScoreExplainerLabelOverrides } from "./labels";

export interface ScoreSource {
  label: string;
  /** Where the evidence lives. With a URL the chip is a link. */
  url?: string;
  /** Shown before the label, e.g. "LinkedIn" or "CRM". Brand names are kept as written. */
  kind?: string;
  /** This particular fact was inferred, not read from the source. */
  inferred?: boolean;
}

export interface ScoreDimension {
  id: string;
  /** "Role fit", "Engagement". */
  label: string;
  /** Points this dimension adds to the score. */
  points: number;
  /** The most it could add. Drives the bar; without it the bar is relative to the whole score. */
  maxPoints?: number;
  /** One sentence in plain words: "Profile keywords found: operations (in title)." */
  reason: string;
  /** The words, tags or values that matched. */
  matched?: string[];
  sources?: ScoreSource[];
  /** The model worked this out; no source states it. */
  inferred?: boolean;
  /** 0 to 1. */
  confidence?: number;
}

export type { ScoreExplainerLabelOverrides };
