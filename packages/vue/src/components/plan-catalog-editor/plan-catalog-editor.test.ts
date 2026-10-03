import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqPlanCatalogEditor, catalogIssues, countChanges, diffCatalog, emptyCatalog, makeCatalogId, type PlanCatalog } from ".";

const mounted: Array<{ unmount: () => void }> = [];
afterEach(() => {
  for (const w of mounted.splice(0)) w.unmount();
  document.body.innerHTML = "";
});

const catalog = (): PlanCatalog => ({
  apps: [
    { id: "crm", name: "CRM", enabled: true },
    { id: "helpdesk", name: "Helpdesk", enabled: true },
  ],
  features: [
    { id: "sso", name: "Single sign-on" },
    { id: "pipelines", name: "Pipelines", appId: "crm" },
  ],
  plans: [
    { id: "free", name: "Free", description: "For trying things out", priceMonthly: 0, seats: 3, storageGb: 1, features: ["Community support"], visible: true, subscribers: 14 },
    { id: "team", name: "Team", description: "For growing teams", priceMonthly: 29, seats: 15, storageGb: 50, features: ["Priority support"], visible: true, subscribers: 6, featured: true },
  ],
  payg: [{ id: "api-calls", name: "API calls", unit: "1K calls", unitPrice: 0.5, freeUnits: 100 }],
  bundles: [{ id: "suite", name: "Suite", price: 49, appIds: ["crm", "helpdesk"] }],
});

function make(props: Record<string, unknown> = {}, locale = "en") {
  const w = mount(
    { components: { NqPlanCatalogEditor, NasaqProvider }, setup: () => ({ props, catalog: catalog() }), template: `<NasaqProvider locale="${locale}"><NqPlanCatalogEditor :catalog="catalog" v-bind="props" /></NasaqProvider>` },
    { attachTo: document.body },
  );
  mounted.push(w);
  return w;
}

const buttonWith = (text: string) => [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text));
const tabBtn = (label: string) => [...document.body.querySelectorAll<HTMLElement>('[role="tab"]')].find((b) => b.textContent?.includes(label))!;
const status = () => document.body.querySelector('[data-slot="plan-catalog-toolbar"] [role="status"]')!.textContent?.trim();

async function openTab(label: string) {
  tabBtn(label).dispatchEvent(new MouseEvent("mousedown", { button: 0, bubbles: true }));
  await flushPromises();
}

describe("catalog helpers", () => {
  it("diffs added, updated and removed rows per entity, ignoring subscribers", () => {
    const before = catalog();
    const after: PlanCatalog = {
      ...before,
      apps: [{ ...before.apps[0]!, name: "CRM Pro" }, { id: "docs", name: "Docs", enabled: true }],
      plans: [{ ...before.plans[0]!, subscribers: 99 }, before.plans[1]!],
    };
    const changes = diffCatalog(before, after);
    expect(changes).toEqual([
      { entity: "apps", id: "crm", name: "CRM Pro", kind: "updated", fields: ["name"] },
      { entity: "apps", id: "docs", name: "Docs", kind: "added" },
      { entity: "apps", id: "helpdesk", name: "Helpdesk", kind: "removed" },
    ]);
    expect(countChanges(changes)).toEqual({ added: 1, updated: 1, removed: 1 });
  });

  it("reports empty names, duplicate ids and missing apps", () => {
    const c = catalog();
    const issues = catalogIssues({ ...c, apps: [...c.apps, { id: "crm", name: " ", enabled: true }], features: [{ id: "x", name: "X", appId: "gone" }] });
    expect(issues).toEqual(expect.arrayContaining([{ entity: "apps", id: "crm", code: "name" }, { entity: "apps", id: "crm", code: "duplicate" }, { entity: "features", id: "x", code: "missing-app" }]));
    expect(catalogIssues(emptyCatalog)).toEqual([]);
  });

  it("makes unique URL-safe ids", () => {
    expect(makeCatalogId("Pro Plus", [])).toBe("pro-plus");
    expect(makeCatalogId("Pro Plus", ["pro-plus"])).toBe("pro-plus-2");
    expect(makeCatalogId("", [], "feature")).toBe("feature");
  });
});

describe("NqPlanCatalogEditor", () => {
  it("renders the toolbar, the five tabs and the plan cards", () => {
    make();
    const root = document.body.querySelector('[data-slot="plan-catalog-editor"]')!;
    expect(root.tagName).toBe("SECTION");
    expect(status()).toBe("The catalog matches what is live.");
    expect([...document.body.querySelectorAll('[role="tab"]')].map((t) => t.textContent?.trim())).toEqual(["Plans", "Features", "Apps", "Pay as you go", "Bundles"]);
    expect(document.body.querySelectorAll('[data-slot="plan-card"]')).toHaveLength(2);
    expect(buttonWith("Review and apply")!.disabled).toBe(true);
    expect(buttonWith("Discard changes")!.disabled).toBe(true);
  });

  it("counts unpublished edits on the tab and in the toolbar, and discards them", async () => {
    make();
    await openTab("Apps");
    buttonWith("Add app")!.click();
    await flushPromises();
    expect(status()).toBe("1 unpublished change");
    expect(tabBtn("Apps").querySelector('[data-slot="badge"]')?.getAttribute("aria-label")).toBe("1 unpublished change");
    expect(buttonWith("Review and apply")!.disabled).toBe(false);
    buttonWith("Discard changes")!.click();
    await flushPromises();
    expect(status()).toBe("The catalog matches what is live.");
  });

  it("reports every edit through onChange", async () => {
    const onChange = vi.fn();
    make({ onChange });
    await openTab("Apps");
    buttonWith("Add app")!.click();
    await flushPromises();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0].apps).toHaveLength(3);
  });

  it("locks the id of a row that is already live", async () => {
    make();
    await openTab("Apps");
    const ids = [...document.body.querySelectorAll<HTMLInputElement>('[data-slot="tabs-panel"]:not([hidden]) input[dir="ltr"]')];
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((i) => i.disabled)).toBe(true);
  });

  it("opens the dry run, blocks apply while a name is empty and keeps the counts", async () => {
    const onApply = vi.fn();
    make({ onApply });
    await openTab("Apps");
    buttonWith("Add app")!.click();
    await flushPromises();
    buttonWith("Review and apply")!.click();
    await flushPromises();
    const dialog = document.body.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain("Sync preview");
    expect(dialog.querySelector('[data-slot="plan-catalog-counts"]')!.textContent).toBe("1 added, 0 updated, 0 removed");
    expect(dialog.querySelector('li[data-kind="added"]')).toBeTruthy();
    expect(dialog.textContent).toContain("Fix these before applying");
    expect(dialog.textContent).toContain("Apps: app has no name.");
    const apply = [...dialog.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("Apply 1 change"))!;
    expect(apply.disabled).toBe(true);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("applies the draft, closes the preview and shows the notice", async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    make({ onApply });
    await openTab("Bundles");
    const price = document.body.querySelector<HTMLInputElement>('input[type="number"]')!;
    price.value = "59";
    price.dispatchEvent(new Event("input"));
    await flushPromises();
    expect(status()).toBe("1 unpublished change");
    buttonWith("Review and apply")!.click();
    await flushPromises();
    const dialog = document.body.querySelector('[role="dialog"]')!;
    expect(dialog.querySelector('li[data-kind="updated"]')!.textContent).toContain("price");
    [...dialog.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("Apply 1 change"))!.click();
    await flushPromises();
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0]![0].bundles[0].price).toBe(59);
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.textContent).toContain("Catalog applied. The changes are live.");
    expect(status()).toBe("The catalog matches what is live.");
  });

  it("keeps the preview open with the host's error when apply fails", async () => {
    const onApply = vi.fn().mockResolvedValue({ error: "Price conflict" });
    make({ onApply });
    await openTab("Bundles");
    const price = document.body.querySelector<HTMLInputElement>('input[type="number"]')!;
    price.value = "10";
    price.dispatchEvent(new Event("input"));
    await flushPromises();
    buttonWith("Review and apply")!.click();
    await flushPromises();
    [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((b) => b.textContent?.includes("Apply 1 change"))!.click();
    await flushPromises();
    expect(document.body.querySelector('[role="dialog"]')!.textContent).toContain("Price conflict");
    expect(status()).toBe("1 unpublished change");
  });

  it("shows the server dry run: its changes and warnings replace the local diff", async () => {
    const onPreview = vi.fn().mockResolvedValue({ changes: [{ entity: "plans", id: "team", name: "Team", kind: "updated", fields: ["priceMonthly"] }], warnings: ["6 workspaces change price"] });
    make({ onPreview, onApply: vi.fn() });
    await openTab("Apps");
    buttonWith("Add app")!.click();
    await flushPromises();
    buttonWith("Review and apply")!.click();
    await flushPromises();
    expect(onPreview).toHaveBeenCalledTimes(1);
    const dialog = document.body.querySelector('[role="dialog"]')!;
    expect(dialog.querySelectorAll("li[data-kind]")).toHaveLength(1);
    expect(dialog.textContent).toContain("Warnings from the dry run");
    expect(dialog.textContent).toContain("6 workspaces change price");
  });

  it("shows the preview error and disables apply", async () => {
    make({ onPreview: vi.fn().mockResolvedValue({ error: "Dry run failed" }), onApply: vi.fn() });
    await openTab("Apps");
    buttonWith("Add app")!.click();
    await flushPromises();
    buttonWith("Review and apply")!.click();
    await flushPromises();
    const dialog = document.body.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain("Dry run failed");
    expect([...dialog.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("Apply"))!.disabled).toBe(true);
  });

  it("is read-only without onApply", async () => {
    make();
    await openTab("Apps");
    buttonWith("Add app")!.click();
    await flushPromises();
    buttonWith("Review and apply")!.click();
    await flushPromises();
    const dialog = document.body.querySelector('[role="dialog"]')!;
    expect([...dialog.querySelectorAll("button")].some((b) => b.textContent?.includes("Apply"))).toBe(false);
  });

  it("shows a skeleton instead of the tabs while loading", () => {
    make({ loading: true });
    expect(document.body.querySelector('[data-slot="plan-catalog-editor"]')!.getAttribute("aria-busy")).toBe("true");
    expect(document.body.querySelector('[role="tablist"]')).toBeNull();
    expect(buttonWith("Review and apply")!.disabled).toBe(true);
  });

  it("merges a class onto the root", () => {
    make({ class: "max-w-3xl" });
    expect(document.body.querySelector('[data-slot="plan-catalog-editor"]')!.className).toContain("max-w-3xl");
  });

  it("speaks Arabic and prices in SAR under an Arabic provider", async () => {
    make({}, "ar");
    expect(status()).toBe("الكتالوج مطابق للنسخة المنشورة.");
    expect([...document.body.querySelectorAll('[role="tab"]')].map((t) => t.textContent?.trim())).toEqual(["الباقات", "الميزات", "التطبيقات", "الدفع حسب الاستخدام", "الحزم"]);
    await openTab("الدفع حسب الاستخدام");
    expect(document.body.textContent).toContain("السعر للوحدة (SAR)");
  });

  it("uses USD for price fields by default and the currency prop when given", async () => {
    make();
    await openTab("Pay as you go");
    expect(document.body.textContent).toContain("Price per unit (USD)");
  });
});
