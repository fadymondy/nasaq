import type { ScoreDimension } from "../score-explainer";
import type { LeadAttribution, LeadSourceKind, LeadStatus } from "./leads-inbox-logic";

/** A rating from a scoring model, rendered as a NqScoreBadge. */
export interface LeadScore {
  score: number;
  dimensions: ScoreDimension[];
  summary?: string;
  confidence?: number;
  model?: string;
  aiGenerated?: boolean;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  /** In the workspace currency, shown as given. */
  budget?: string;
  status: LeadStatus;
  receivedAt: Date | string | number;
  /** Which form it came through. */
  form?: string;
  attribution?: LeadAttribution;
  /** Present when a scoring model rated it. */
  score?: LeadScore;
  /** Set once converted. */
  contact?: { id: string; name: string };
  companyRef?: { id: string; name: string };
  deal?: { id: string; name: string };
}

export interface LeadConversion {
  contactName: string;
  /** A company name to create, or undefined for none. */
  company?: string;
  /** A deal title to open, or undefined for none. */
  deal?: string;
}

export type LeadActionResult = void | { error?: string };

export const LEAD_SOURCE_VARIANT: Record<LeadSourceKind, "accent" | "info" | "brand" | "success" | "neutral" | "outline"> = {
  paid: "accent",
  organic: "success",
  social: "info",
  email: "brand",
  referral: "neutral",
  direct: "outline",
};

export const LEAD_STATUS_VARIANT: Record<LeadStatus, "info" | "warning" | "brand" | "success" | "danger"> = {
  new: "info",
  contacted: "warning",
  qualified: "brand",
  converted: "success",
  spam: "danger",
};
