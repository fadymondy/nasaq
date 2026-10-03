import type { CampaignChannel } from "./campaign-logic";

export interface CampaignAudience {
  id: string;
  label: string;
  description?: string;
  /** People reachable on each channel. Used when there is no `onCountAudience`. */
  counts?: Partial<Record<CampaignChannel, number>>;
}

export interface CampaignDraft {
  channel: CampaignChannel;
  audienceId: string | null;
  subject: string;
  /** HTML for email, plain text for WhatsApp. */
  body: string;
}

export type CampaignResult = void | { error?: string };

export interface CampaignSendProgress {
  sent: number;
  failed: number;
  total: number;
}
