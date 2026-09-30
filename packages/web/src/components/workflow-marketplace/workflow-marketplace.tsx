"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { type CatalogCategory, type CatalogItem, type CatalogLabels, type CatalogResult, CatalogStore } from "../catalog-store";
import { Toggle, ToggleGroup } from "../toggle-group";
import type { WorkflowFieldDef } from "../workflow-canvas";
import { WorkflowNetwork, type WorkflowNetworkLink, type WorkflowNetworkStep } from "../workflow-network";

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

const STRINGS: { en: WorkflowMarketplaceLabels; ar: WorkflowMarketplaceLabels } = {
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

export interface WorkflowMarketplaceProps {
  listings: WorkflowListing[];
  categories: CatalogCategory[];
  /** Install a step into the workspace's palette or a preset as a new workflow. */
  onInstall?: (listing: WorkflowListing) => Promise<CatalogResult>;
  onUninstall?: (listing: WorkflowListing) => Promise<CatalogResult>;
  /** The "Open" action once installed (open the builder). */
  onOpen?: (listing: WorkflowListing) => void;
  className?: string;
  labels?: Partial<WorkflowMarketplaceLabels> & { store?: Partial<CatalogLabels> };
}

/**
 * The store of workflow steps and ready-made presets. Steps show what they take, give and ask for;
 * presets show the diagram they install. It is a thin layer over [`CatalogStore`].
 */
export function WorkflowMarketplace({ listings, categories, onInstall, onUninstall, onOpen, className, labels }: WorkflowMarketplaceProps) {
  const ar = (useOptionalNasaq()?.locale ?? "en").startsWith("ar");
  const { store, ...own } = labels ?? {};
  const t = { ...STRINGS[ar ? "ar" : "en"], ...own } as WorkflowMarketplaceLabels;
  const [kind, setKind] = useState<"all" | WorkflowListingKind>("all");
  const byId = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);
  const shown = useMemo(() => {
    const list = kind === "all" ? listings : listings.filter((l) => l.kind === kind);
    return list.map((l): CatalogItem => {
      const { kind: k, step, preset, ...rest } = l;
      return { ...rest, badge: k === "preset" ? (ar ? "قالب" : "Preset") : step?.role === "trigger" ? t.trigger : t.action };
    });
    // biome-ignore lint/correctness/useExhaustiveDependencies: t is derived from ar and labels
  }, [listings, kind, ar]);
  const back = (item: CatalogItem) => byId.get(item.id) as WorkflowListing;

  function detail(item: CatalogItem): ReactNode {
    const l = byId.get(item.id);
    if (!l) return null;
    if (l.kind === "preset" && l.preset) {
      return (
        <section className="flex flex-col gap-1.5">
          <h4 className="eyebrow">
            {t.preview} <Badge variant="neutral">{t.stepsCount(new Intl.NumberFormat("en").format(l.preset.steps.length))}</Badge>
          </h4>
          <WorkflowNetwork steps={l.preset.steps} {...(l.preset.links ? { links: l.preset.links } : {})} layout="vertical" />
        </section>
      );
    }
    const s = l.step;
    if (!s) return null;
    return (
      <>
        <section className="grid grid-cols-2 gap-3">
          {(
            [
              [t.inputs, s.inputs],
              [t.outputs, s.outputs],
            ] as const
          ).map(([title, list]) => (
            <div key={title} className="flex flex-col gap-1.5">
              <h4 className="eyebrow">{title}</h4>
              <div className="flex flex-wrap gap-1.5">
                {list?.length ? (
                  list.map((x) => (
                    <Badge key={x} variant="outline">
                      {x}
                    </Badge>
                  ))
                ) : (
                  <span className="text-caption text-muted-foreground">{t.none}</span>
                )}
              </div>
            </div>
          ))}
        </section>
        {s.fields?.length ? (
          <section className="flex flex-col gap-1.5">
            <h4 className="eyebrow">{t.fields}</h4>
            <ul className="divide-y divide-border rounded-card border border-border">
              {s.fields.map((f) => (
                <li key={f.name} className="flex items-center justify-between gap-3 px-3 py-2 text-body-sm">
                  <span className="text-foreground">
                    {f.label}
                    {f.required ? <span className="ms-1 text-caption text-muted-foreground">({t.required})</span> : null}
                  </span>
                  <code dir="ltr" className="text-caption text-muted-foreground">
                    {f.kind}
                  </code>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </>
    );
  }

  return (
    <CatalogStore
      className={className}
      items={shown}
      categories={categories}
      {...(onInstall ? { onInstall: (i: CatalogItem) => onInstall(back(i)) } : {})}
      {...(onUninstall ? { onUninstall: (i: CatalogItem) => onUninstall(back(i)) } : {})}
      {...(onOpen ? { onOpen: (i: CatalogItem) => onOpen(back(i)) } : {})}
      renderDetail={detail}
      {...(store ? { labels: store } : {})}
      toolbarStart={
        <ToggleGroup value={[kind]} onValueChange={(v) => v[0] && setKind(v[0] as "all" | WorkflowListingKind)} aria-label={t.kindLabel}>
          <Toggle value="all">{t.kindAll}</Toggle>
          <Toggle value="step">{t.kindStep}</Toggle>
          <Toggle value="preset">{t.kindPreset}</Toggle>
        </ToggleGroup>
      }
    />
  );
}
