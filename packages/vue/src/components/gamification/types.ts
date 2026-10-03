import type { Component } from "vue";
import type { AchievementLike, LeaderboardEntryLike } from "./gamification-logic";

/** Something a person can earn. Generic: the app supplies the words, the icon and the goal. */
export interface Achievement extends AchievementLike {
  title: string;
  description?: string;
  /** A lucide-vue-next icon. */
  icon?: Component;
  /** XP awarded when earned. */
  xp?: number;
  /** Hide the title and description until it is earned. */
  secret?: boolean;
}

export interface LeaderboardEntry extends LeaderboardEntryLike {
  avatar?: string;
  /** A second line under the name, e.g. a team or a title. */
  subtitle?: string;
}

export interface LeaderboardPeriod {
  id: string;
  label: string;
}

export type RewardStatus = "available" | "owned" | "locked";
