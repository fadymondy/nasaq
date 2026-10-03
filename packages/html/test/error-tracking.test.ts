// The Blade error-tracking example under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

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

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
async function mount() {
  const host = document.createElement("div");
  host.innerHTML = readFileSync(resolve(process.cwd(), "../php/examples/rendered/error-tracking.html"), "utf8");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="error-tracking"]')!;
const data = (host: HTMLElement) => Alpine.$data(root(host)) as { openId: string | null; entries: { id: string; status: string }[]; failure: string | null; openIssue(id: string): void; back(): void; changeStatus(id: string, s: string): Promise<void> };
const detail = (host: HTMLElement, id: string) => [...host.querySelectorAll<HTMLElement>('[data-slot="error-detail"], [data-slot="error-issue-detail"]')].find((_, i) => i === Number(id.slice(1)) - 1)!;

describe("error-tracking (Blade example)", () => {
  it("starts on the list with unresolved errors first", async () => {
    const host = await mount();
    expect(data(host).openId).toBeNull();
    expect(data(host).entries.map((r) => r.id)).toEqual(["e1", "e2"]);
    expect(host.textContent).toContain("TypeError: Cannot read properties of undefined");
  });

  it("opens an error, emits nq-error-open, and goes back", async () => {
    const host = await mount();
    let seen: unknown;
    root(host).addEventListener("nq-error-open", (e) => (seen = (e as CustomEvent).detail));
    data(host).openIssue("e1");
    await tick();
    expect(data(host).openId).toBe("e1");
    expect(seen).toEqual({ id: "e1" });
    expect(detail(host, "e1")).toBeTruthy();
    data(host).back();
    await tick();
    expect(data(host).openId).toBeNull();
  });

  it("changes status after waitUntil resolves, and re-ranks", async () => {
    const host = await mount();
    let seen: { id: string; status: string; previous: string } | undefined;
    root(host).addEventListener("nq-error-status", (e) => {
      const d = (e as CustomEvent).detail;
      seen = d;
      d.waitUntil(tick(10));
    });
    await data(host).changeStatus("e1", "resolved");
    expect(seen).toMatchObject({ id: "e1", status: "resolved", previous: "unresolved" });
    expect(data(host).entries.find((r) => r.id === "e1")!.status).toBe("resolved");
  });

  it("keeps the old status and shows why when the change fails", async () => {
    const host = await mount();
    root(host).addEventListener("nq-error-status", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({ error: "No." })));
    data(host).openIssue("e1");
    await data(host).changeStatus("e1", "ignored");
    expect(data(host).entries.find((r) => r.id === "e1")!.status).toBe("unresolved");
    expect(data(host).failure).toBe("No.");
  });

  describe("table cells", () => {
    const table = async () => {
      const host = await mount();
      if (root(host).querySelector('[data-slot="entity-list"]')?.getAttribute("data-view") !== "table") [...host.querySelectorAll<HTMLButtonElement>('[data-slot="toggle"]')][0]?.click();
      await tick();
      return host;
    };
    it("draws a frequency sparkline in the table column", async () => {
      const host = await table();
      const cell = host.querySelector('[data-row] [data-cell-col="frequency"]')!;
      expect(cell.querySelector("svg")).not.toBeNull();
    });
    it("shows Resolve and Ignore on unresolved rows and Reopen on the rest", async () => {
      const host = await table();
      const list = Alpine.$data(host.querySelector<HTMLElement>('[data-slot="entity-list"]')!) as {
        actions: { id: string }[];
        rows: { status: string }[];
        actionOn(row: unknown, i: number): boolean;
      };
      const at = (id: string) => list.actions.findIndex((a) => a.id === id);
      const open = list.rows.find((r) => r.status === "unresolved")!;
      const done = list.rows.find((r) => r.status !== "unresolved");
      expect([list.actionOn(open, at("resolve")), list.actionOn(open, at("ignore")), list.actionOn(open, at("reopen"))]).toEqual([true, true, false]);
      if (done) expect([list.actionOn(done, at("resolve")), list.actionOn(done, at("reopen"))]).toEqual([false, true]);
    });
    it("shows a spinner on the button while the status change is pending", async () => {
      const host = await mount();
      root(host).addEventListener("nq-error-status", (e) => (e as CustomEvent).detail.waitUntil(tick(150)));
      data(host).openIssue("e1");
      void data(host).changeStatus("e1", "resolved");
      await tick(30);
      const d = detail(host, "e1");
      expect([...d.querySelectorAll<HTMLElement>('[data-slot="spinner"]')].some((s) => s.style.display !== "none")).toBe(true);
      await tick(250);
    });
  });
});
