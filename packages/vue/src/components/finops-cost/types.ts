import type { LineItemPeriod, PlanOption, ServerUsage } from "./finops-format";

export type FinopsCostResult = void | { error?: string };

export interface CostServer {
  id: string;
  name: string;
  /** Plan name as the provider sells it: text only. */
  plan: string;
  region?: string;
  monthlyPrice: number;
  /** Average use over the period, 0 to 100 each. */
  usage: ServerUsage;
  /** The next plan down and up, used for the hint text and the saving. */
  smallerPlan?: PlanOption;
  largerPlan?: PlanOption;
}

export interface CostItem {
  id: string;
  name: string;
  category?: string;
  amount: number;
  period: LineItemPeriod;
}

export interface CostItemInput {
  name: string;
  category: string;
  amount: number;
  period: LineItemPeriod;
}
