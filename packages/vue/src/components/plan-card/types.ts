/** One line of a plan's feature list. A bare string is an included feature. */
export interface PlanFeature {
  label: string;
  /** `false` lists it as not included (a muted dash), so people see what the next plan adds. Default true. */
  included?: boolean;
  /** A short explanation, shown in a tooltip on the label. */
  hint?: string;
}
