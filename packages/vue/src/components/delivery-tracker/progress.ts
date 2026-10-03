// Copy of deliveryProgress and the step types in packages/web/src/lib/delivery.ts. The duration and money helpers are
// reused from courier-card/delivery.ts.
export const DELIVERY_STEPS = ["placed", "assigned", "picked-up", "on-the-way", "delivered"] as const;
export type DeliveryStep = (typeof DELIVERY_STEPS)[number];
export type DeliveryTerminal = "cancelled" | "failed";
export type DeliveryOrderStatus = DeliveryStep | DeliveryTerminal;
export type DeliveryStepState = "done" | "current" | "upcoming" | "stopped";

export interface DeliveryProgressStep {
  key: DeliveryStep;
  state: DeliveryStepState;
}

export interface DeliveryProgress {
  steps: DeliveryProgressStep[];
  /** Index of the current step, -1 when delivered or stopped. */
  current: number;
  /** 0 to 1 along the five steps. */
  fraction: number;
  terminal?: DeliveryTerminal;
}

/** The state of each of the five steps. A cancelled or failed order keeps the reached steps done and marks the next one stopped. */
export function deliveryProgress(status: DeliveryOrderStatus, reachedBefore: DeliveryStep = "placed"): DeliveryProgress {
  if (status === "cancelled" || status === "failed") {
    const last = Math.max(0, DELIVERY_STEPS.indexOf(reachedBefore));
    const steps = DELIVERY_STEPS.map((key, i): DeliveryProgressStep => ({ key, state: i <= last ? "done" : i === last + 1 ? "stopped" : "upcoming" }));
    return { steps, current: -1, fraction: last / (DELIVERY_STEPS.length - 1), terminal: status };
  }
  const at = DELIVERY_STEPS.indexOf(status);
  const delivered = status === "delivered";
  const steps = DELIVERY_STEPS.map((key, i): DeliveryProgressStep => ({ key, state: delivered || i < at ? "done" : i === at ? "current" : "upcoming" }));
  return { steps, current: delivered ? -1 : at, fraction: at / (DELIVERY_STEPS.length - 1) };
}
