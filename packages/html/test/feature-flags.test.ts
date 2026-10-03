// The Blade feature-flags example (packages/php/examples/rendered/feature-flags.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

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
  host.innerHTML = rendered("feature-flags");
  document.body.append(host);
  Alpine.initTree(host);
  await tick(80);
  return host.querySelector<HTMLElement>('[data-slot="feature-flag-list"]')!;
}

const rowsOf = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("[data-row]")];
const act = (row: HTMLElement, action: string, key: string) => row.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action, row: { id: key, key } } }));

describe("feature-flags (Blade example)", () => {
  it("lists the flags newest first with name, key, switches, rollout and state", async () => {
    const list = await mount();
    const rows = rowsOf(list);
    expect(rows).toHaveLength(4);
    expect(rows[0]!.textContent).toContain("New checkout");
    expect(rows[0]!.textContent).toContain("new-checkout");
    expect(rows[0]!.textContent).toContain("Rolling out");
    expect(rows[0]!.textContent).toContain("25%");
    expect(rows[0]!.textContent).toContain("by Mona");
    expect(rows[2]!.textContent).toContain("Killed");
    expect(list.textContent).toContain("Production");
    expect(rows[0]!.querySelectorAll('[role="switch"]')).toHaveLength(2);
    expect(rows[0]!.querySelectorAll('[role="switch"]')[1]!.getAttribute("aria-checked")).toBe("true");
    expect(rows[1]!.querySelectorAll('[role="switch"]')[1]!.getAttribute("aria-checked")).toBe("false");
  });

  it("fires toggle from a switch and keeps the new value on success", async () => {
    const list = await mount();
    const seen: string[] = [];
    list.addEventListener("toggle", (e: Event) => {
      const d = (e as CustomEvent).detail;
      seen.push(`${d.key}:${d.environment}:${d.enabled}`);
      d.wait(Promise.resolve());
    });
    const sw = rowsOf(list)[1]!.querySelectorAll<HTMLElement>('[role="switch"]')[1]!;
    sw.click();
    await tick(80);
    expect(seen).toEqual(["dark-mode:prod:true"]);
    expect(rowsOf(list)[1]!.querySelectorAll('[role="switch"]')[1]!.getAttribute("aria-checked")).toBe("true");
  });

  it("rolls a switch back when the host reports an error", async () => {
    const list = await mount();
    list.addEventListener("toggle", (e) => (e as unknown as CustomEvent).detail.wait(Promise.resolve({ error: "Nope" })));
    rowsOf(list)[1]!.querySelectorAll<HTMLElement>('[role="switch"]')[1]!.click();
    await tick(80);
    expect(rowsOf(list)[1]!.querySelectorAll('[role="switch"]')[1]!.getAttribute("aria-checked")).toBe("false");
  });

  it("disables a killed flag's switches and draws the rollout bar like React", async () => {
    const list = await mount();
    const killed = rowsOf(list)[2]!.querySelectorAll<HTMLButtonElement>('[role="switch"]');
    expect([...killed].every((b) => b.disabled && b.hasAttribute('data-disabled'))).toBe(true);
    expect(rowsOf(list)[0]!.querySelectorAll<HTMLButtonElement>('[role="switch"]')[0]!.disabled).toBe(false);
    // The rollout bar never changes tone (React: always bg-primary), 100% for the killed flag.
    const bar = rowsOf(list)[2]!.querySelector<HTMLElement>('.bg-primary.rounded-full.h-full')!;
    expect(bar.getAttribute('style')).toContain('100%');
    expect(rowsOf(list)[2]!.querySelector('[role="meter"]')).toBeNull();
  });

  it("refuses to switch a killed flag", async () => {
    const list = await mount();
    let fired = false;
    list.addEventListener("toggle", () => (fired = true));
    rowsOf(list)[2]!.querySelectorAll<HTMLElement>('[role="switch"]')[0]!.click();
    await tick(80);
    expect(fired).toBe(false);
    expect(rowsOf(list)[2]!.querySelectorAll('[role="switch"]')[0]!.getAttribute("aria-checked")).toBe("true");
  });

  it("fires create and open, and removes a deleted row", async () => {
    const list = await mount();
    const seen: string[] = [];
    list.addEventListener("create", () => seen.push("create"));
    list.addEventListener("open", (e) => seen.push(`open:${(e as CustomEvent).detail.key}`));
    list.addEventListener("delete", (e) => {
      seen.push(`delete:${(e as CustomEvent).detail.key}`);
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    [...list.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("New flag"))!.click();
    rowsOf(list)[0]!.click();
    act(rowsOf(list)[1]!, "open", "dark-mode");
    act(rowsOf(list)[1]!, "delete", "dark-mode");
    await tick(80);
    expect(seen).toEqual(["create", "open:new-checkout", "open:dark-mode", "delete:dark-mode"]);
    expect(rowsOf(list)).toHaveLength(3);
  });

  it("shows the generic error when a delete is rejected and keeps the rows", async () => {
    const list = await mount();
    list.addEventListener("delete", (e) => (e as CustomEvent).detail.wait(Promise.reject(new Error("x"))));
    act(rowsOf(list)[0]!, "delete", "new-checkout");
    await tick(80);
    expect(list.textContent).toContain("Could not save this. Try again.");
    expect(rowsOf(list)).toHaveLength(4);
  });
});
