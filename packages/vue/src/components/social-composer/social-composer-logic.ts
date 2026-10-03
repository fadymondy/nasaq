/*
 * Social post rules, pure. Each platform has its own text limit, its own way of counting, and sometimes needs media.
 * The limits follow the write plugins of fadymondy.com-v2 (internal/social/platforms.go); nothing is cut for you.
 */

export type SocialPlatform = "x" | "bluesky" | "threads" | "linkedin" | "facebook" | "instagram" | "tiktok";
export type SocialMediaKind = "image" | "video";

export interface SocialPlatformRule {
  key: SocialPlatform;
  /** The platform's own name. Brand names are shown as text, not as a logo. */
  label: string;
  /** Text limit in the platform's own counting. */
  limit: number;
  /** The post cannot go out without this kind of media. */
  requiresMedia?: SocialMediaKind;
  /** Most hashtags accepted. */
  maxHashtags?: number;
  /** How many characters a link weighs. Others count it in full. */
  linkWeight?: number;
}

export const SOCIAL_PLATFORMS: readonly SocialPlatformRule[] = [
  { key: "x", label: "X", limit: 280, linkWeight: 23 },
  { key: "bluesky", label: "Bluesky", limit: 300 },
  { key: "threads", label: "Threads", limit: 500 },
  { key: "linkedin", label: "LinkedIn", limit: 3000 },
  { key: "facebook", label: "Facebook", limit: 63206 },
  { key: "instagram", label: "Instagram", limit: 2200, requiresMedia: "image", maxHashtags: 30 },
  { key: "tiktok", label: "TikTok", limit: 2200, requiresMedia: "video" },
];

export function socialRule(platform: SocialPlatform): SocialPlatformRule {
  return SOCIAL_PLATFORMS.find((p) => p.key === platform) as SocialPlatformRule;
}

const LINK = /https?:\/\/\S+/g;
const HASHTAG = /(^|\s)#[\p{L}\p{N}_]+/gu;

/** Length the way the platform counts it: characters (code points), and X weighs every link as 23. */
export function socialLength(platform: SocialPlatform, text: string): number {
  const rule = socialRule(platform);
  if (!rule.linkWeight) return Array.from(text).length;
  const links = text.match(LINK) ?? [];
  return Array.from(text.replace(LINK, "")).length + rule.linkWeight * links.length;
}

export function hashtagCount(text: string): number {
  return (text.match(HASHTAG) ?? []).length;
}

export interface SocialMedia {
  id: string;
  kind: SocialMediaKind;
  name: string;
}

export type SocialProblem = "empty" | "over" | "media" | "hashtags";

export interface SocialPlatformCheck {
  platform: SocialPlatform;
  /** What is sent: the platform's own version when there is one, else the shared text. */
  text: string;
  usesVariant: boolean;
  length: number;
  limit: number;
  /** Characters left; negative when over. */
  remaining: number;
  /** "near" from 90% of the limit. */
  level: "ok" | "near" | "over";
  problems: SocialProblem[];
}

/** Checks the shared text (and any per-platform versions) against every chosen platform. */
export function checkSocialPost({
  body,
  variants = {},
  platforms,
  media = [],
}: {
  body: string;
  variants?: Partial<Record<SocialPlatform, string>>;
  platforms: readonly SocialPlatform[];
  media?: readonly SocialMedia[];
}): SocialPlatformCheck[] {
  return SOCIAL_PLATFORMS.filter((r) => platforms.includes(r.key)).map((rule) => {
    const own = variants[rule.key];
    const usesVariant = own !== undefined && own.trim() !== "";
    const text = usesVariant ? (own as string) : body;
    const length = socialLength(rule.key, text);
    const problems: SocialProblem[] = [];
    if (text.trim() === "") problems.push("empty");
    if (length > rule.limit) problems.push("over");
    if (rule.requiresMedia && !media.some((m) => m.kind === rule.requiresMedia)) problems.push("media");
    if (rule.maxHashtags && hashtagCount(text) > rule.maxHashtags) problems.push("hashtags");
    return {
      platform: rule.key,
      text,
      usesVariant,
      length,
      limit: rule.limit,
      remaining: rule.limit - length,
      level: length > rule.limit ? "over" : length >= rule.limit * 0.9 ? "near" : "ok",
      problems,
    };
  });
}

/** True when at least one platform is chosen and none has a problem. */
export function socialReady(checks: readonly SocialPlatformCheck[]): boolean {
  return checks.length > 0 && checks.every((c) => c.problems.length === 0);
}

export type SocialTargetStatus = "draft" | "queued" | "published" | "failed";

export interface SocialMetrics {
  impressions?: number;
  likes?: number;
  replies?: number;
  reposts?: number;
  clicks?: number;
}

export function socialEngagements(m: SocialMetrics): number {
  return (m.likes ?? 0) + (m.replies ?? 0) + (m.reposts ?? 0) + (m.clicks ?? 0);
}

/** Engagements over impressions, or null when nothing was seen yet. */
export function socialEngagementRate(m: SocialMetrics): number | null {
  return m.impressions ? socialEngagements(m) / m.impressions : null;
}

/** Totals over the rows that are published: impressions, engagements and the blended rate. */
export function summarizeSocialMetrics(rows: readonly (SocialMetrics & { status: SocialTargetStatus })[]) {
  const published = rows.filter((r) => r.status === "published");
  const impressions = published.reduce((sum, r) => sum + (r.impressions ?? 0), 0);
  const engagements = published.reduce((sum, r) => sum + socialEngagements(r), 0);
  return { posts: published.length, failed: rows.filter((r) => r.status === "failed").length, impressions, engagements, rate: impressions ? engagements / impressions : null };
}
