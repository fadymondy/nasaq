import type { CatalogItem } from "../catalog-store";
import type { WorkflowFieldDef } from "../workflow-canvas";
import type { WorkflowNetworkLink, WorkflowNetworkStep } from "../workflow-network";

export type WorkflowListingKind = "step" | "preset";

export interface WorkflowListing extends Omit<CatalogItem, "badge" | "details"> {
  /** A single step you can add to any workflow, or a ready-made preset of several. */
  kind: WorkflowListingKind;
  /** Steps: what the step asks for and passes on. */
  step?: {
    role?: "trigger" | "action";
    fields?: WorkflowFieldDef[];
    inputs?: string[];
    outputs?: string[];
  };
  /** Presets: the steps it installs, shown as a diagram. */
  preset?: {
    steps: WorkflowNetworkStep[];
    links?: WorkflowNetworkLink[];
  };
}

export interface WorkflowMarketplaceLabels {
  kindAll: string;
  kindStep: string;
  kindPreset: string;
  kindLabel: string;
  trigger: string;
  action: string;
  fields: string;
  required: string;
  inputs: string;
  outputs: string;
  preview: string;
  stepsCount: (n: string) => string;
  none: string;
}

export const WORKFLOW_MARKETPLACE_STRINGS: { en: WorkflowMarketplaceLabels; ar: WorkflowMarketplaceLabels } = {
  en: {
    kindAll: "All",
    kindStep: "Steps",
    kindPreset: "Presets",
    kindLabel: "Kind",
    trigger: "Trigger",
    action: "Action",
    fields: "Settings",
    required: "required",
    inputs: "Takes",
    outputs: "Gives",
    preview: "What it does",
    stepsCount: (n) => `${n} steps`,
    none: "Nothing",
  },
  ar: {
    kindAll: "الكل",
    kindStep: "خطوات",
    kindPreset: "قوالب جاهزة",
    kindLabel: "النوع",
    trigger: "مُشغّل",
    action: "إجراء",
    fields: "الإعدادات",
    required: "مطلوب",
    inputs: "يستقبل",
    outputs: "يعطي",
    preview: "ماذا يفعل",
    stepsCount: (n) => `${n} خطوات`,
    none: "لا شيء",
  },
};
