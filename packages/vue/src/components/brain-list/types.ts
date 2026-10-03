import type { EntityPerson, EntityTag } from "../entity-list";

export type BrainStatus = "ready" | "indexing" | "paused" | "error";
export type BrainVisibility = "private" | "team" | "public";

export interface BrainSummary {
  id: string;
  name: string;
  /** One or two lines on what the brain knows. */
  description?: string;
  /** An emoji or an image URL shown as the brain's mark. Falls back to a brain icon. */
  avatar?: string;
  status: BrainStatus;
  visibility: BrainVisibility;
  /** Facts, notes and documents retained. */
  memories: number;
  /** Connected data sources. */
  sources: number;
  /** Conversations held. */
  chats?: number;
  /** Model name such as "claude-sonnet". Shown left-to-right. */
  model?: string;
  members?: EntityPerson[];
  tags?: EntityTag[];
  lastActive?: Date | string | number | null;
}
