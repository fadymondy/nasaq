import type { Component } from "vue";
import type { PromoLike } from "./loyalty-logic";

export interface LoyaltyTier {
  id: string;
  name: string;
  /** Lifetime points needed to reach it. */
  minPoints: number;
  /** A perk line such as "Free delivery". */
  perk?: string;
}

export interface LoyaltyReward {
  id: string;
  title: string;
  description?: string;
  /** Cost in points. */
  cost: number;
  /** A component rendered as the reward's picture. */
  art?: Component;
}

export type PointsEntryKind = "earn" | "redeem" | "expire" | "adjust";

export interface PointsEntry {
  id: string;
  kind: PointsEntryKind;
  /** Signed: positive adds, negative takes away. */
  points: number;
  date: Date | number | string;
  note: string;
  balanceAfter?: number;
}

export interface PromoApplied {
  code: string;
  /** Minor units taken off. */
  discount: number;
}

export interface PromoCode extends PromoLike {
  id: string;
  /** Times used so far. */
  used: number;
}

export interface PromoCodeInput {
  code: string;
  type: "percent" | "fixed";
  /** Percent: basis points. Fixed: minor units. */
  value: number;
  maxDiscount?: number;
  minSubtotal?: number;
  startsOn?: string;
  endsOn?: string;
  maxRedemptions?: number;
  perCustomer?: number;
  firstOrderOnly: boolean;
  active: boolean;
}

export type VisitStatus = "completed" | "no-show" | "cancelled";

export interface Visit {
  id: string;
  date: Date | number | string;
  place: string;
  /** Minor units. 0 for a cancelled or free visit. */
  spend: number;
  points: number;
  status: VisitStatus;
}
