// The Blade leads-inbox example (packages/php/examples/rendered/leads-inbox.html) under real Alpine, plus the pure helpers.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { canConvertLead, canMoveLead, classifyLeadSource, leadPipelineStates, leadStatusCounts } from "../src/alpine/leads-inbox-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

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
  document.body.innerHTML = "";
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("leads-inbox");
  document.body.append(host);
  Alpine.initTree(host);
  await tick(80);
  return host.querySelector<HTMLElement>('[data-slot="leads-inbox"]')!;
}

type Detail = Record<string, unknown> & { wait: (p: Promise<unknown>) => void };
function answer(root: HTMLElement, answers: Record<string, (d: Detail) => unknown>) {
  const seen: { name: string; detail: Detail }[] = [];
  for (const [name, fn] of Object.entries(answers)) {
    root.addEventListener(name, (e) => {
      const detail = (e as CustomEvent<Detail>).detail;
      seen.push({ name, detail });
      detail.wait(Promise.resolve().then(() => fn(detail)));
    });
  }
  return seen;
}
const data = (root: HTMLElement) => Alpine.$data(root) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (root: HTMLElement, action: string, id: string) => root.dispatchEvent(new CustomEvent("nq-entity-list-action", { bubbles: true, detail: { action, row: { id } } }));
const text = (el: Element) => el.textContent!.replace(/\s+/g, " ").trim();
const stageButton = (root: HTMLElement, key: string) => root.querySelector<HTMLButtonElement>(`[data-stage="${key}"]`)!;
const ids = (root: HTMLElement) => data(root).lead_rows.rows.map((r: { id: string }) => r.id);

describe("leads-inbox helpers", () => {
  it("classifies sources, moves and counts", () => {
    expect(classifyLeadSource({ gclid: "x" })).toMatchObject({ kind: "paid", name: "Google Ads" });
    expect(classifyLeadSource(undefined).kind).toBe("direct");
    expect(canMoveLead("converted", "new")).toBe(false);
    expect(canConvertLead("spam")).toBe(false);
    expect(leadPipelineStates("contacted").map((s) => s.state)).toEqual(["done", "current", "todo", "todo"]);
    expect(leadStatusCounts([{ status: "new" }, { status: "spam" }] as never).all).toBe(2);
  });
});

describe("leads-inbox (Blade example)", () => {
  it("lists the leads with their allowed row actions and filters by stage", async () => {
    const root = await mount();
    expect(ids(root)).toEqual(["l1", "l2", "l3"]);
    expect(data(root).lead_rows.rows[0].actions).toContain("convert");
    expect(data(root).lead_rows.rows[0].actions).not.toContain("move-new");
    expect(text(root)).toContain("Sara Haddad");
    stageButton(root, "qualified").click();
    await tick();
    expect(ids(root)).toEqual(["l3"]);
    expect(text(stageButton(root, "all"))).toContain("3");
  });

  it("moves a lead by a row action and reports a host error", async () => {
    const root = await mount();
    const seen = answer(root, { "lead-status": () => ({ error: "Not allowed" }) });
    act(root, "move-contacted", "l1");
    await tick();
    expect(seen[0]!.detail.status).toBe("contacted");
    expect(data(root).failure).toBe("Not allowed");
    expect(data(root).lead("l1").status).toBe("new");
  });

  it("toggles to the cards layout and opens the score explainer from a row badge", async () => {
    const root = await mount();
    const list = root.querySelector<HTMLElement>('[data-slot="entity-list"]')!;
    expect(list.getAttribute("data-view")).toBe("table");
    const toggle = root.querySelectorAll<HTMLElement>('[data-slot="toggle"]');
    expect(toggle.length).toBe(2);
    toggle[1]!.click();
    await tick();
    expect(list.getAttribute("data-view")).toBe("cards");
    expect(root.querySelectorAll("[data-card]").length).toBeGreaterThan(0);
    toggle[0]!.click();
    await tick();
    const badge = [...root.querySelectorAll<HTMLElement>('[data-slot="score-badge"]')].find((b) => (b.closest("span.contents") as HTMLElement).style.display !== "none")!;
    expect(badge).toBeDefined();
    badge.click();
    await tick();
    expect(badge.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector('[data-slot="score-explainer"]')).not.toBeNull();
  });

  it("opens the detail panel when a row is clicked, but not from the score badge", async () => {
    const root = await mount();
    const badge = root.querySelector<HTMLElement>('[data-slot="score-badge"]')!;
    badge.click();
    await tick();
    expect(data(root).detail.open).toBe(false);
    root.querySelector<HTMLElement>('[data-slot="entity-list"] [data-row]')!.click();
    await tick();
    expect(data(root).detail.open).toBe(true);
  });

  it("opens the detail panel, shows attribution and sends a reply", async () => {
    const root = await mount();
    const seen = answer(root, { "lead-reply": () => undefined });
    root.dispatchEvent(new CustomEvent("nq-entity-list-row-click", { bubbles: true, detail: { row: { id: "l1" } } }));
    await tick();
    const sheet = document.querySelector('[data-slot="sheet-content"]')!;
    expect(sheet).not.toBeNull();
    expect(text(sheet)).toContain("We are looking for a delivery dashboard");
    expect(text(sheet)).toContain("UTM campaign");
    expect(text(sheet)).toContain("Cj0KCQjw-demo");
    const d = data(root);
    d.pickSnippet(d.config.canned[0]);
    expect(d.detail.text).toContain("Hi Sara");
    await d.send();
    expect(seen[0]!.detail.message).toContain("Hi Sara");
    expect(d.detail.note).toBe("Reply sent");
    expect(d.detail.text).toBe("");
  });

  it("converts a lead through the dialog", async () => {
    const root = await mount();
    const seen = answer(root, { "lead-convert": () => undefined });
    act(root, "convert", "l1");
    await tick();
    const d = data(root);
    expect(d.convert.open).toBe(true);
    expect(d.convert.name).toBe("Sara Haddad");
    expect(d.convert.withCompany).toBe(true);
    await d.submitConvert();
    await tick();
    expect(seen[0]!.detail.conversion).toEqual({ contactName: "Sara Haddad", company: "Acme Logistics" });
    expect(d.lead("l1").status).toBe("converted");
    expect(d.convert.open).toBe(false);
    expect(ids(root)).toContain("l1");
    expect(data(root).lead_rows.rows[0].actions).not.toContain("convert");
  });

  it("moves a lead from the detail panel", async () => {
    const root = await mount();
    const d = data(root);
    await d.setStatus("l2", "qualified", "detail");
    // The example answers lead-status itself, so the move succeeds.
    expect(d.lead("l2").status).toBe("qualified");
  });
});
