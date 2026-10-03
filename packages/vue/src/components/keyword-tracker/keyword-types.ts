import type { SerpFeature } from "./keyword-labels";
import type { RankPosition } from "./rank-math";

export type { SerpFeature } from "./keyword-labels";

export type KeywordDevice = "desktop" | "mobile";

export interface TrackedKeyword {
  id: string;
  keyword: string;
  /** Where the site ranks now. `null` when it is not in the top 100. */
  position: RankPosition;
  /** The position at the previous check. Gives the change arrow. */
  previousPosition?: RankPosition;
  /** Daily positions, oldest first, for the trend line. `null` is a day without a rank. */
  history?: readonly RankPosition[];
  /** The best position the keyword has held. Default: the best of `history`, then of the current position. */
  best?: RankPosition;
  /** The URL that ranks. */
  url?: string;
  /** Searches a month. */
  volume: number;
  /** 0 (easy) to 100 (hard). */
  difficulty: number;
  features?: readonly SerpFeature[];
}

/** One competitor: its rank for each tracked keyword id, and how visible it is overall. */
export interface KeywordCompetitor {
  id: string;
  domain: string;
  /** Marks the row that is the site itself. */
  you?: boolean;
  ranks: Record<string, RankPosition>;
}

export interface AddKeywordsInput {
  keywords: string[];
  location: string;
  device: KeywordDevice;
}

export interface KeywordLocation {
  value: string;
  label: string;
}

export type KeywordResult = void | { error?: string };
