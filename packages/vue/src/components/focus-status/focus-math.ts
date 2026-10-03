/** The presence a person shows to others. Do not disturb wins over everything else. */
export type FocusState = "available" | "focus" | "break" | "dnd";

export interface FocusInput {
  /** From the pomodoro: which phase, and whether its countdown has started. */
  phase: "focus" | "shortBreak" | "longBreak";
  status: "idle" | "running" | "paused" | "done";
}

/**
 * Turns a pomodoro (or anything shaped like one) and the do-not-disturb switch into one presence.
 * A focus that is paused still counts as focus: the person is mid-session. Not started means available.
 */
export function focusStateOf(input: FocusInput | null | undefined, dnd = false): FocusState {
  if (dnd) return "dnd";
  if (!input || input.status === "idle" || input.status === "done") return "available";
  return input.phase === "focus" ? "focus" : "break";
}
