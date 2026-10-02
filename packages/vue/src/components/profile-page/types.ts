import type { BlogPostSummary } from "../blog-index";
import type { NowItem, ProfileAvailability, ProfileStat, ProfileWorkingHours, Skill, SocialLink, WeatherCondition } from "../personal-widgets";
import type { Product } from "../product-switcher";

export interface ProfileJob {
  id: string;
  role: string;
  company: string;
  companyHref?: string;
  location?: string;
  /** ISO date. */
  start: string;
  /** ISO date. Missing means current. */
  end?: string | null;
  summary?: string;
  highlights?: string[];
  skills?: string[];
}

export interface ProfileProject {
  slug: string;
  title: string;
  description: string;
  cover?: string;
  coverAlt?: string;
  /** Filter tab: "Product", "Open source". */
  category?: string;
  tags?: string[];
  href?: string;
  repoHref?: string;
  year?: number;
  /** Shown as the feature story above the grid. Only the first one is. */
  featured?: boolean;
  /** Proof points for the featured story. */
  points?: string[];
}

export interface ProfileTestimonial {
  quote: string;
  name: string;
  role?: string;
  avatar?: string;
}

export interface ProfileWeather {
  city: string;
  temperature: number;
  condition: WeatherCondition;
  high?: number;
  low?: number;
}

export interface ProfileData {
  name: string;
  /** "@fadymondy": shown under the name, always left to right. */
  handle?: string;
  headline: string;
  /** A short plain-text bio for the identity column. Falls back to the headline. */
  bio?: string;
  /** ISO date the account was created: "Joined January 2023". */
  joined?: string;
  avatar?: string;
  location?: string;
  /** IANA zone, for the clock. */
  timeZone?: string;
  workingHours?: ProfileWorkingHours;
  availability?: ProfileAvailability;
  availabilityNote?: string;
  /** Markdown. */
  about?: string;
  email?: string;
  links?: SocialLink[];
  experience?: ProfileJob[];
  skills?: Skill[];
  projects?: ProfileProject[];
  posts?: BlogPostSummary[];
  testimonials?: ProfileTestimonial[];
  stats?: ProfileStat[];
  now?: NowItem[];
  nowUpdated?: string;
  weather?: ProfileWeather;
  /** Link to the CV file. */
  cvHref?: string;
}

/** An app the member uses with this account: a `Product` (official mark, localised name) plus how they use it. */
export interface ProfileApp extends Product {
  /** Their role in it: "Owner", "Admin", "Member". */
  role?: string;
  /** The organisation it is installed for. */
  org?: string;
  /** The plan, e.g. "Pro". */
  plan?: string;
  /** ISO date. */
  lastUsed?: string;
}

/** One line of the owner's account details. */
export interface ProfileAccountDetail {
  label: string;
  value: string;
}

export type ProfileSidebarData = Pick<ProfileData, "name" | "handle" | "headline" | "bio" | "joined" | "avatar" | "location" | "availability" | "availabilityNote" | "links" | "cvHref" | "email">;
