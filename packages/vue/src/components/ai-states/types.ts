import type { Component } from "vue";
import type { AiActionLike } from "./ai-states-logic";

/** An action offered by the split button, the menu and the chips. */
export interface AiAction extends AiActionLike {
  /** A component (a lucide icon) drawn before the label. Default the sparkle. */
  icon?: Component;
  /** Key sequence shown at the inline end, e.g. "Mod Shift S". Display only. */
  shortcut?: string;
  disabled?: boolean;
}

export type AiStreamState = "idle" | "streaming" | "stopped" | "done" | "error";
