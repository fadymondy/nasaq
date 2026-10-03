import type { Component } from "vue";

export interface HowItWorksStep {
  title: string;
  description?: string;
  /** Optional icon (a component such as a lucide icon) inside the number badge instead of the number. */
  icon?: Component;
  /** Optional picture under the text: a component rendered with no props. For markup use the `media` slot, which receives `{ step, index }`. */
  media?: Component;
}

export interface FeatureGridItem {
  /** An icon component (a lucide icon). */
  icon?: Component;
  title: string;
  description?: string;
  /** Makes the whole tile a link. */
  href?: string;
  /** Wide tile: spans two columns from 48rem. */
  wide?: boolean;
}

export interface PricingPack {
  id: string;
  /** "Starter pack". */
  name: string;
  /** Units the pack gives: 500 credits. */
  credits: number;
  /** Free extra units on top. */
  bonus?: number;
  price: number;
  currency?: string;
  /** The best value pack: brand-tinted, on at most one. */
  highlighted?: boolean;
  /** "Best value". */
  badge?: string;
  /** One line: "About 50 reports". */
  description?: string;
}

export interface PricingPacksLabels {
  buy?: string;
  bonus?: string;
  unit?: string;
  perUnit?: string;
}

export interface SessionPlaybackLabels {
  play?: string;
  pause?: string;
  restart?: string;
  position?: string;
  transcript?: string;
}
