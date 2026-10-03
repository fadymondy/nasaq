import type { StatusHue, StatusStage } from "./status-label-logic";

export type StatusLabelResult = void | { error?: string };

export interface StatusDraft {
  /** Set when editing; absent when creating. */
  id?: string;
  name: string;
  hue: StatusHue;
  stage: StatusStage;
}
export interface LabelDraft {
  id?: string;
  name: string;
  hue: StatusHue;
}
