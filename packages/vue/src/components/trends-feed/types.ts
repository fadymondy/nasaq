import type { SourceHealth, SourceTier, TrendState } from "./trends-feed-math";

export interface TrendOutlet {
  id: string;
  name: string;
}

export interface TrendItem {
  id: string;
  title: string;
  outlet: string;
  url?: string;
  publishedAt: Date | string | number;
}

export interface TrendTopic {
  id: string;
  title: string;
  summary?: string;
  /** 0 to 100. */
  score: number;
  /** Short reasons in words: "Mentioned by 6 outlets", "Up 340% since yesterday". */
  reasons?: readonly string[];
  outlets: readonly TrendOutlet[];
  items: readonly TrendItem[];
  detectedAt: Date | string | number;
  state: TrendState;
}

export interface TrendSource {
  id: string;
  name: string;
  url?: string;
  tier: SourceTier;
  enabled: boolean;
  health: SourceHealth;
  lastFetchedAt?: Date | string | number;
  /** Average articles per day. */
  perDay?: number;
}
