/** Pure helpers for the AI model picker. Same as the React `model-picker-math`. */

/** The effort to land on when the model changes: keep the current one if the model supports it, else "medium", else the first. */
export function resolveEffort(model: { efforts?: readonly string[] } | undefined, current: string | undefined): string | undefined {
  const efforts = model?.efforts;
  if (!efforts?.length) return undefined;
  if (current && efforts.includes(current)) return current;
  return efforts.includes("medium") ? "medium" : efforts[0];
}

/** Whether the selection can be submitted: it has a model, and an agent when one is required. */
export function selectionReady(sel: { model?: string; agent?: string }, agentRequired: boolean): boolean {
  return !!sel.model && (!agentRequired || !!sel.agent);
}
