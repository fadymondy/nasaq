import type { Component } from "vue";

export type AiModelTier = "flagship" | "balanced" | "fast";

export interface AiModel {
  id: string;
  /** The model's name as people know it: "Sonnet 5.5". Not translated. */
  label: string;
  description?: string;
  /** Who runs it, shown as small text: "Anthropic". */
  provider?: string;
  tier?: AiModelTier;
  /** Reasoning efforts this model supports, lowest first: `["low", "medium", "high"]`. None means no effort control. */
  efforts?: readonly string[];
  /** Context window in tokens. */
  contextWindow?: number;
  /** Price per million tokens, in `currency`. */
  price?: { input: number; output: number };
  disabled?: boolean;
}

export interface AiAgentOption {
  id: string;
  label: string;
  description?: string;
}

export interface AiModelSelection {
  model?: string;
  effort?: string;
  agent?: string;
}

export interface AiPersona {
  id: string;
  name: string;
  description?: string;
  /** Glyph before the name: a `lucide-vue-next` icon component. Decorative. Default a bot. */
  icon?: Component;
  /** Prompt starters for this persona, shown when it is selected. */
  starters?: readonly string[];
}
