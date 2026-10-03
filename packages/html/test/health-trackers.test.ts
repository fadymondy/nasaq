// The Blade example (php/examples/health-trackers.blade.php) mounted under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { cupCounts, cupState, foodDraftCompleteness, foodDraftValid, verdictCounts, verdictTone } from "../src/alpine/health-trackers-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const slot = (host: HTMLElement, name: string) => host.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;
const button = (root: HTMLElement, text: string) => [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === text)!;
const shown = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
const type = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("health helpers", () => {
  it("works out cups, verdicts and completeness", () => {
    expect(cupState(0, 2, 5)).toBe("filled");
    expect(cupState(2, 2, 5)).toBe("next");
    expect(cupCounts(9, 4)).toEqual({ filled: 4, total: 4 });
    expect(verdictCounts([{ verdict: "safe" }, { verdict: "trigger" }, { verdict: "unreviewed" }])).toEqual({ safe: 1, trigger: 1, unreviewed: 1 });
    expect(verdictTone("unreviewed")).toBe("neutral");
    const draft = { kind: "food" as const, name: "Egg", verdict: "trigger" as const, triggerFamilies: [] };
    expect(foodDraftValid(draft)).toBe(false);
    expect(foodDraftCompleteness(draft).missing).toContain("families");
  });
});

describe("cup tracker", () => {
  it("draws the cups and logs the next one", async () => {
    const host = await mountHtml(rendered("health-trackers"));
    const root = slot(host, "cup-tracker");
    expect(root.querySelector('[role="group"]')!.getAttribute("aria-label")).toBe("7 of 12 cups logged today");
    expect(root.querySelectorAll('[data-state="filled"]')).toHaveLength(7);
    expect(root.querySelectorAll('[data-state="empty"]')).toHaveLength(4);
    let logged = 0;
    root.addEventListener("log", (e) => {
      logged++;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    root.querySelector<HTMLButtonElement>('button[data-state="next"]')!.click();
    await tick();
    expect(logged).toBe(1);
    expect(root.querySelectorAll('[data-state="filled"]')).toHaveLength(8);
    expect(root.querySelector('[role="group"]')!.getAttribute("aria-label")).toBe("8 of 12 cups logged today");
  });

  it("shows the error and a generic one when nobody listens", async () => {
    const host = await mountHtml(rendered("health-trackers"));
    const root = slot(host, "cup-tracker");
    root.querySelector<HTMLButtonElement>('button[data-state="next"]')!.click();
    await tick();
    expect(root.querySelector('p[role="alert"]')!.textContent).toBe("Could not log the cup.");
    expect(root.querySelectorAll('[data-state="filled"]')).toHaveLength(7);
    root.addEventListener("log", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Too soon" })));
    root.querySelector<HTMLButtonElement>('button[data-state="next"]')!.click();
    await tick();
    expect(root.querySelector('p[role="alert"]')!.textContent).toBe("Too soon");
  });
});

describe("quick log strip", () => {
  it("logs an item, shows a refusal and offers Log anyway", async () => {
    const host = await mountHtml(rendered("health-trackers"));
    const root = slot(host, "quick-log-strip");
    expect(root.textContent).toContain("Water");
    const seen: boolean[] = [];
    root.addEventListener("log", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push(d.override);
      d.wait(Promise.resolve(d.override ? undefined : { error: "Over the limit", canOverride: true }));
    });
    button(root, "Water").click();
    await tick();
    expect(root.textContent).toContain("Over the limit");
    expect(shown(button(root, "Log anyway"))).toBe(true);
    button(root, "Log anyway").click();
    await tick();
    expect(seen).toEqual([false, true]);
    expect(root.textContent).toContain("Logged Water");
    expect(shown(button(root, "Log anyway"))).toBe(false);
  });

  it("shows a flagged entry as a warning", async () => {
    const host = await mountHtml(rendered("health-trackers"));
    const root = slot(host, "quick-log-strip");
    root.addEventListener("log", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ flagged: true })));
    button(root, "Espresso").click();
    await tick();
    expect(root.textContent).toContain("Logged Espresso and flagged it");
  });
});

describe("food catalogue", () => {
  it("lists the items with their verdicts", async () => {
    const host = await mountHtml(rendered("health-trackers"));
    const root = slot(host, "food-catalogue");
    expect(root.textContent).toContain("Green tea");
    expect(root.textContent).toContain("Unreviewed");
    expect(root.textContent).toContain("Safe · Decided by you");
    expect(button(root, "Add item")).toBeDefined();
  });

  it("confirms before deleting, then removes the row", async () => {
    const host = await mountHtml(rendered("health-trackers"));
    const root = slot(host, "food-catalogue");
    const deleted: string[] = [];
    root.addEventListener("delete", (e) => {
      const d = (e as CustomEvent).detail;
      deleted.push(d.id);
      d.wait(Promise.resolve());
    });
    root.dispatchEvent(new CustomEvent("nq-entity-list-action", { detail: { action: "delete", row: { id: "tea" } } }));
    await tick(80);
    expect(document.body.textContent).toContain("Delete Green tea?");
    const confirm = [...document.body.querySelectorAll<HTMLButtonElement>("button")].filter((b) => b.textContent!.trim() === "Delete").pop()!;
    confirm.click();
    await tick(80);
    expect(deleted).toEqual(["tea"]);
    expect(root.textContent).not.toContain("Green tea");
  });

  it("pins through the pin event and shows an error from the host", async () => {
    const host = await mountHtml(rendered("health-trackers"));
    const root = slot(host, "food-catalogue");
    root.addEventListener("pin", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Pin limit reached" })));
    root.dispatchEvent(new CustomEvent("nq-entity-list-action", { detail: { action: "pin", row: { id: "yogurt" } } }));
    await tick();
    expect(root.querySelector('p[role="alert"]')!.textContent).toBe("Pin limit reached");
  });
});

describe("food item builder", () => {
  it("validates the name, then saves the draft", async () => {
    const host = await mountHtml(rendered("health-trackers"));
    const root = slot(host, "food-item-builder");
    const saved: { name: string }[] = [];
    root.addEventListener("save", (e) => {
      const d = (e as CustomEvent).detail;
      saved.push(d.draft);
      d.wait(Promise.resolve());
    });
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(saved).toHaveLength(0);
    expect(shown(root.querySelector('[data-slot="field-error"]'))).toBe(true);
    type(root.querySelector<HTMLInputElement>("input")!, "Oats");
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(saved.map((d) => d.name)).toEqual(["Oats"]);
  });

  it("asks for a family when the verdict is trigger", async () => {
    const host = await mountHtml(rendered("health-trackers"));
    const root = slot(host, "food-item-builder");
    type(root.querySelector<HTMLInputElement>("input")!, "Tea");
    const fieldset = [...root.querySelectorAll("fieldset")].find((f) => f.textContent!.includes("Trigger families"))!;
    expect(shown(fieldset)).toBe(false);
    button(root, "Trigger").click();
    await tick();
    expect(shown(fieldset)).toBe(true);
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(fieldset.textContent).toContain("A trigger needs at least one family.");
    expect(button(root, "Trigger").getAttribute("aria-checked")).toBe("true");
  });
});

describe("flagged entries", () => {
  it("opens to the list of entries", async () => {
    const host = await mountHtml(rendered("health-trackers"));
    const root = slot(host, "flagged-entries");
    expect(root.textContent).toContain("1 flagged");
    root.querySelector<HTMLButtonElement>("button")!.click();
    await tick(250);
    expect(root.textContent).toContain("Logged after the cut-off time.");
    expect(root.textContent).toContain("Caffeine:");
  });

describe("food catalogue table cells", () => {
  const table = async () => {
    const host = await mountHtml(rendered("health-trackers"));
    const root = slot(host, "food-catalogue");
    if (root.querySelector('[data-slot="entity-list"]')?.getAttribute("data-view") !== "table") [...root.querySelectorAll<HTMLButtonElement>('[data-slot="toggle"]')][0]?.click();
    await tick(60);
    return root;
  };
  const list = (root: HTMLElement) =>
    Alpine.$data(root.querySelector<HTMLElement>('[data-slot="entity-list"]')!) as { actions: { id: string }[]; rows: { id: string; pinned: boolean }[]; actionOn(r: unknown, i: number): boolean; shown: Record<string, boolean> };

  it("puts a pin icon on pinned names and a status chip in the verdict column", async () => {
    const root = await table();
    const tea = [...root.querySelectorAll<HTMLElement>("[data-row]")].find((r) => r.textContent!.includes("Green tea"))!;
    expect(tea.querySelector('[data-cell-col="name"] svg[aria-label="Pinned"]')).not.toBeNull();
    expect(tea.querySelector('[data-cell-col="verdict"] [data-slot="status"]')).not.toBeNull();
  });

  it("hides the note column until the View menu shows it", async () => {
    const root = await table();
    const d = list(root);
    expect(d.shown.note).toBe(false);
    expect((root.querySelector('[data-slot="table-head"][data-col="note"]') as HTMLElement | null)?.style.display ?? "none").toBe("none");
    expect(root.querySelector('[data-slot="entity-list-columns"]')).not.toBeNull();
    d.shown.note = true;
    await tick();
    expect((root.querySelector('[data-row] [data-cell-col="note"]') as HTMLElement).style.display).not.toBe("none");
  });

  it("offers one Pin / Unpin entry per row", async () => {
    const root = await table();
    const d = list(root);
    const at = (id: string) => d.actions.findIndex((a) => a.id === id);
    for (const r of d.rows) expect([d.actionOn(r, at("pin")), d.actionOn(r, at("unpin"))]).toEqual(r.pinned ? [false, true] : [true, false]);
  });
});
});
