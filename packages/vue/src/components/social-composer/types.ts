import type { SocialMedia, SocialMetrics, SocialPlatform, SocialTargetStatus } from "./social-composer-logic";

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  /** The handle or page name: "@nasaq", "Nasaq Studio". */
  name: string;
}

export interface SocialPost {
  body: string;
  /** A platform's own text, when it differs from `body`. */
  variants: Partial<Record<SocialPlatform, string>>;
  accountIds: string[];
  media: SocialMedia[];
  /** null publishes right away. */
  scheduledAt: Date | null;
}

export interface SocialComposerAssistAction {
  id: string;
  label: string;
}

export interface SocialMetricsRow extends SocialMetrics {
  id: string;
  platform: SocialPlatform;
  /** The account it went to. */
  account?: string;
  /** The post text; the table shows the start of it. */
  text: string;
  status: SocialTargetStatus;
  publishedAt?: Date | string | null;
}
