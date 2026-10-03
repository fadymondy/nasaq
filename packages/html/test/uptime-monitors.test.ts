// The Blade uptime-monitors example (packages/php/examples/rendered/uptime-monitors.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { formatUptime, overallStatus, responseLabel } from "../src/alpine/uptime-monitors-logic";

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
  host.innerHTML = rendered("uptime-monitors");
  document.body.append(host);
  Alpine.initTree(host);
  await tick(80);
  return host;
}

const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const submit = (form: HTMLElement) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
const rowsOf = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("[data-row]")];
const act = (root: HTMLElement, action: string, id: string) =>
  root.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action, row: { id } } }));

describe("uptime helpers", () => {
  it("truncates uptime, picks the overall status and formats response times", () => {
    expect(formatUptime(99.996)).toBe("99.99%");
    expect(formatUptime(null)).toBe("–");
    expect(overallStatus(["up", "down"])).toBe("partial-outage");
    expect(overallStatus(["down"])).toBe("major-outage");
    expect(overallStatus(["up", "paused"])).toBe("operational");
    expect(responseLabel(2400)).toBe("2.4 s");
    expect(responseLabel(182)).toBe("182 ms");
  });
});

describe("uptime-monitors (Blade example)", () => {
  it("renders the card, the overall status, the rows and the incidents", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="uptime-monitors"]')!;
    expect(root.textContent).toContain("Partial outage");
    const rows = rowsOf(root);
    expect(rows).toHaveLength(3);
    expect(rows[0]!.textContent).toContain("Storefront");
    expect(rows[0]!.textContent).toContain("99.96%");
    expect(rows[0]!.textContent).toContain("12 of 12 checks up");
    expect(rows[1]!.textContent).toContain("2.4 s");
    expect(root.querySelectorAll('[data-slot="incident"]')).toHaveLength(2);
    expect(root.textContent!.replace(/\s+/g, " ")).toContain("1 Open");
  });

  it("renders the standalone badges and bar", async () => {
    const host = await mount();
    const badges = [...host.querySelectorAll<HTMLElement>('[data-slot="uptime-badge"]')];
    expect(badges.map((b) => b.textContent!.replace(/\s+/g, " ").trim())).toEqual(["99.99% 30d", "99.50% 7d", "91.50% 24h", "–"]);
    const bar = host.querySelector<HTMLElement>('[data-slot="uptime-bar"]')!;
    expect(bar.getAttribute("role")).toBe("img");
    expect(bar.querySelectorAll("span")).toHaveLength(5);
    expect(bar.getAttribute("aria-label")).toBe("3 of 4 recent checks were up");
  });

  it("switches the uptime period", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="uptime-monitors"]')!;
    const toggle = [...root.querySelectorAll<HTMLElement>('[data-slot="toggle"]')].find((t) => t.getAttribute("aria-label") === "24 hours")!;
    toggle.click();
    await tick(80);
    expect(rowsOf(root)[0]!.textContent).toContain("100%");
    expect(rowsOf(root)[1]!.textContent).toContain("91.50%");
  });

  it("fires pause, then marks the row paused; ignores check now on a paused monitor", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="uptime-monitors"]')!;
    const seen: string[] = [];
    for (const name of ["pause", "check", "resume"]) {
      root.addEventListener(name, (e) => {
        seen.push(`${name}:${(e as CustomEvent).detail.id}`);
        (e as CustomEvent).detail.wait(Promise.resolve());
      });
    }
    act(root, "pause", "m1");
    await tick(80);
    expect(rowsOf(root)[0]!.textContent).toContain("Paused");
    act(root, "check", "m3");
    act(root, "pause", "m3");
    await tick(40);
    act(root, "resume", "m3");
    await tick(80);
    expect(seen).toEqual(["pause:m1", "resume:m3"]);
  });

  it("validates, fires save with the input, and adds the row", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="uptime-monitors"]')!;
    let saved: { input: unknown; id?: string } | undefined;
    root.addEventListener("save", (e) => {
      const d = (e as CustomEvent).detail;
      saved = { input: d.input, id: d.id };
      d.wait(Promise.resolve({ id: "m9", status: "up", uptime: { "30d": 100 } }));
    });
    [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("Add monitor"))!.click();
    await tick(80);
    const form = document.querySelector<HTMLElement>('[data-slot="monitor-form"]')!;
    const [name, target] = [...form.querySelectorAll<HTMLInputElement>("input")].filter((i) => i.type !== "hidden");
    submit(form);
    await tick();
    expect(saved).toBeUndefined();
    expect(form.textContent).toContain("This field is required.");
    type(name!, "Docs");
    type(target!, "https://docs.example.com");
    submit(form);
    await tick(80);
    expect(saved).toEqual({ input: { name: "Docs", target: "https://docs.example.com", kind: "http", intervalSec: 60 }, id: undefined });
    expect(rowsOf(root)).toHaveLength(4);
  });

  it("shows a save error in the dialog", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="uptime-monitors"]')!;
    root.addEventListener("save", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Name taken" })));
    act(root, "edit", "m1");
    await tick(80);
    const form = document.querySelector<HTMLElement>('[data-slot="monitor-form"]')!;
    expect(form.querySelector<HTMLInputElement>("input")!.value).toBe("Storefront");
    submit(form);
    await tick(80);
    expect(form.textContent).toContain("Name taken");
    expect(rowsOf(root)).toHaveLength(3);
  });

  it("asks before deleting, then fires delete with the id and drops the row", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="uptime-monitors"]')!;
    let id: unknown;
    root.addEventListener("delete", (e) => {
      id = (e as CustomEvent).detail.id;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    act(root, "delete", "m2");
    await tick(80);
    expect(id).toBeUndefined();
    const confirm = [...document.querySelectorAll<HTMLButtonElement>('[data-slot="alert-dialog-action"]')].find((b) => b.textContent?.includes("Delete"))!;
    confirm.click();
    await tick(80);
    expect(id).toBe("m2");
    expect(rowsOf(root)).toHaveLength(2);
  });
});
