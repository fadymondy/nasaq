/** Pure helpers for model routing: which models fit a task, route validation and provider registration checks. */

export const MODALITIES = ["text", "vision", "audio", "image", "embedding"] as const;
export type RoutingModality = (typeof MODALITIES)[number];

export interface RoutingRoute {
  /** Model id that handles the task class. */
  model?: string;
  /** Model id tried when the main one fails or is rate limited. */
  fallback?: string;
}

export interface RoutingValue {
  /** Automatic routing: the system picks a model per task. Manual routes are then only hints. */
  auto: boolean;
  /** Routes by task class id. */
  routes: Record<string, RoutingRoute>;
  /** Id of the active provider or backend. */
  backend?: string;
}

export interface RoutingIssue {
  taskId: string;
  kind: "missing" | "same" | "unknown";
}

interface ModelLike {
  id: string;
  modalities?: readonly RoutingModality[];
}
interface TaskLike {
  id: string;
  /** The modality a model must support to take this task. Default text. */
  modality?: RoutingModality;
}

/** Models that can take a task: those declaring its modality. A model that declares none is treated as text. */
export function modelsFor<M extends ModelLike>(task: TaskLike, models: readonly M[]): M[] {
  const need = task.modality ?? "text";
  return models.filter((m) => (m.modalities && m.modalities.length > 0 ? m.modalities : (["text"] as const)).includes(need));
}

/**
 * Problems with the routes. With auto routing off every task needs a model; a fallback must differ from the main
 * model; ids that no longer exist in `models` are unknown. With auto on only unknown and same-as-main are reported.
 */
export function routingIssues(value: RoutingValue, tasks: readonly TaskLike[], models: readonly ModelLike[]): RoutingIssue[] {
  const known = new Set(models.map((m) => m.id));
  const issues: RoutingIssue[] = [];
  for (const task of tasks) {
    const r = value.routes[task.id] ?? {};
    if (!r.model) {
      if (!value.auto) issues.push({ taskId: task.id, kind: "missing" });
      continue;
    }
    if (!known.has(r.model) || (r.fallback && !known.has(r.fallback))) issues.push({ taskId: task.id, kind: "unknown" });
    else if (r.fallback && r.fallback === r.model) issues.push({ taskId: task.id, kind: "same" });
  }
  return issues;
}

const clean = (r: RoutingRoute | undefined) => ({ model: r?.model || undefined, fallback: r?.fallback || undefined });

export function routingEquals(a: RoutingValue, b: RoutingValue): boolean {
  if (a.auto !== b.auto || (a.backend ?? undefined) !== (b.backend ?? undefined)) return false;
  const keys = new Set([...Object.keys(a.routes), ...Object.keys(b.routes)]);
  for (const k of keys) {
    const x = clean(a.routes[k]);
    const y = clean(b.routes[k]);
    if (x.model !== y.model || x.fallback !== y.fallback) return false;
  }
  return true;
}

export function toggleModality(list: readonly RoutingModality[], m: RoutingModality): RoutingModality[] {
  const next = list.includes(m) ? list.filter((x) => x !== m) : [...list, m];
  return MODALITIES.filter((x) => next.includes(x));
}

export function isValidEndpoint(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export interface ProviderDraftErrors {
  name?: "required" | "duplicate";
  endpoint?: "required" | "invalid";
  modalities?: "required";
}

export function validateProvider(
  draft: { name: string; endpoint: string; modalities: readonly RoutingModality[] },
  existing: readonly { name: string }[],
  requireEndpoint = true,
): ProviderDraftErrors {
  const errors: ProviderDraftErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = "required";
  else if (existing.some((p) => p.name.trim().toLowerCase() === name.toLowerCase())) errors.name = "duplicate";
  if (requireEndpoint) {
    if (!draft.endpoint.trim()) errors.endpoint = "required";
    else if (!isValidEndpoint(draft.endpoint)) errors.endpoint = "invalid";
  }
  if (draft.modalities.length === 0) errors.modalities = "required";
  return errors;
}
