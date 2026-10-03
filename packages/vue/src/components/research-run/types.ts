import type { CopilotSource } from "../copilot-chat";
import type { ResearchStageState } from "./research-run-logic";

export type ResearchStatus = "queued" | "running" | "done" | "failed" | "cancelled";

export interface ResearchStage {
  id: string;
  label: string;
  state: ResearchStageState;
  /** A short note such as "12 pages". */
  detail?: string;
}

export interface ResearchEvidence {
  id: string;
  /** The `CopilotSource` this passage comes from. */
  sourceId: string;
  /** The passage, as found. */
  quote: string;
  /** 0 to 1. */
  relevance?: number;
}

export interface ResearchAnswerBlock {
  id: string;
  /** One paragraph of the answer. */
  text: string;
  /** Ids of the evidence this paragraph rests on. */
  cites?: readonly string[];
}

export interface ResearchRunData {
  id: string;
  question: string;
  status: ResearchStatus;
  stages?: readonly ResearchStage[];
  sourcesChecked?: number;
  sourcesRead?: number;
  answer?: readonly ResearchAnswerBlock[];
  evidence?: readonly ResearchEvidence[];
  /** Cited sources, shown with `NqCopilotSources`. */
  sources?: readonly CopilotSource[];
  /** 0 to 1. */
  confidence?: number;
  /** The model that wrote the answer. */
  model?: string;
  finishedAt?: Date | string | number;
  /** Why it failed. */
  error?: string;
}

export type ResearchRunResult = void | { error?: string };
