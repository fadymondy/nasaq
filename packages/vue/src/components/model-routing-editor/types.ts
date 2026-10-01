import type { RoutingModality } from "./routing-math";

export interface RoutingTaskClass {
  id: string;
  /** Localised name: "Chat", "Summaries", "Image understanding". */
  label: string;
  description?: string;
  /** Modality a model must support. Default text. */
  modality?: RoutingModality;
}

export interface RoutingModel {
  id: string;
  /** Model name. Not translated. */
  label: string;
  modalities?: readonly RoutingModality[];
}

export interface RoutingProvider {
  id: string;
  name: string;
  kind?: "cloud" | "node";
  endpoint?: string;
  modalities: readonly RoutingModality[];
  status?: "online" | "offline";
}

export type RegisterProviderInput = { name: string; kind: "cloud" | "node"; endpoint: string; modalities: RoutingModality[] };
export type RoutingResult = void | { error?: string };
