export interface SocialLink {
  /** Which network. GitHub shows its official mark; other brands show their name as text, never a stand-in icon. */
  kind: "github" | "linkedin" | "x" | "youtube" | "instagram" | "email" | "website" | "other";
  label: string;
  href: string;
  /** "@fadymondy": shown after the label, always left to right. */
  handle?: string;
}
export interface NowItem {
  /** "Building", "Reading", "Learning". */
  label: string;
  text: string;
  href?: string;
}
export interface ProfileStat {
  label: string;
  value: number;
  /** "+" after the number: "12+". */
  suffix?: string;
  /** `compact` shows 12K. Default plain. */
  compact?: boolean;
}
export interface Skill {
  name: string;
  group?: string;
  /** 1 to 5. Shown as dots. */
  level?: number;
}
export type WeatherCondition = "clear" | "partly-cloudy" | "cloudy" | "rain" | "storm" | "snow" | "fog" | "wind";
