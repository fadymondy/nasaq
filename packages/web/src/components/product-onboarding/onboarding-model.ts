/** Pure helpers for the standard product onboarding: the fixed steps, where to resume, and what is left. */

export const PRODUCT_ONBOARDING_STEPS = ["workspace", "business", "sample-data", "connect-mcp", "invite"] as const;
export type ProductOnboardingStepId = (typeof PRODUCT_ONBOARDING_STEPS)[number];

/** The first two are required; the rest can be skipped. */
export const REQUIRED_ONBOARDING_STEPS: readonly ProductOnboardingStepId[] = ["workspace", "business"];

/** What the product's `GET /api/onboarding` returns. */
export interface ProductOnboardingState {
  completed: string[];
  skipped?: string[];
  dismissed?: boolean;
  finishedAt?: string | null;
}

export type OnboardingAction = "complete" | "skip" | "dismiss" | "finish";

export const isOptionalStep = (id: string) => !(REQUIRED_ONBOARDING_STEPS as readonly string[]).includes(id);

/** The step to open: the first one neither completed nor skipped. Everything handled opens the last step. */
export function onboardingResumeIndex(steps: readonly string[], state: Pick<ProductOnboardingState, "completed" | "skipped">): number {
  const handled = new Set([...(state.completed ?? []), ...(state.skipped ?? [])]);
  const index = steps.findIndex((id) => !handled.has(id));
  return index === -1 ? Math.max(steps.length - 1, 0) : index;
}

/** Whether the "Resume setup" card should still show on the dashboard. */
export function onboardingOpen(state: ProductOnboardingState | null | undefined): boolean {
  if (!state) return true;
  return !state.dismissed && !state.finishedAt;
}

/** Apply an action to the state, the same way the server does. Keeps the lists unique. */
export function applyOnboardingAction(state: ProductOnboardingState, step: string | undefined, action: OnboardingAction, now = new Date()): ProductOnboardingState {
  const completed = new Set(state.completed ?? []);
  const skipped = new Set(state.skipped ?? []);
  const next: ProductOnboardingState = { ...state };
  if (action === "complete" && step) {
    completed.add(step);
    skipped.delete(step);
  } else if (action === "skip" && step && !completed.has(step)) {
    skipped.add(step);
  } else if (action === "dismiss") {
    next.dismissed = true;
  } else if (action === "finish") {
    next.finishedAt = next.finishedAt ?? now.toISOString();
  }
  next.completed = [...completed];
  next.skipped = [...skipped];
  return next;
}

/** Done / total for the checklist card, counting skipped steps as handled. */
export function onboardingProgress(steps: readonly string[], state: Pick<ProductOnboardingState, "completed" | "skipped">) {
  const handled = steps.filter((id) => state.completed.includes(id) || (state.skipped ?? []).includes(id)).length;
  return { done: handled, total: steps.length };
}
