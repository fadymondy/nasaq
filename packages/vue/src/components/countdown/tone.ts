export type TimerRingTone = "primary" | "success" | "info" | "warning" | "neutral";

export const strokeTone: Record<TimerRingTone, string> = {
  primary: "stroke-primary",
  success: "stroke-nq-success",
  info: "stroke-nq-info",
  warning: "stroke-nq-warning",
  neutral: "stroke-muted-foreground",
};

/** Text colour that matches each ring tone, for the phase word or icon inside the ring. */
export const timerToneText: Record<TimerRingTone, string> = {
  primary: "text-primary",
  success: "text-nq-success-text",
  info: "text-nq-info-text",
  warning: "text-nq-warning-text",
  neutral: "text-muted-foreground",
};
