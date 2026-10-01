import type { Component } from "vue";

export type WorkflowNetworkKind = "step" | "decision" | "human" | "system" | "output";

export interface WorkflowNetworkStep {
  id: string;
  title: string;
  description?: string;
  /** Overrides the icon the kind gives (a `lucide-vue-next` component). */
  icon?: Component;
  /** Who or what does it ("Support agent", "Billing API"). */
  owner?: string;
  /** Default "step". Drives the card's look and the kind badge. */
  kind?: WorkflowNetworkKind;
}

export interface WorkflowNetworkLink {
  from: string;
  to: string;
  /** Text on the connector ("Approved", "Yes"). */
  label?: string;
}

export interface WorkflowNetworkLabels {
  kind: Record<WorkflowNetworkKind, string>;
  network: string;
  stepCount: (n: string) => string;
}
