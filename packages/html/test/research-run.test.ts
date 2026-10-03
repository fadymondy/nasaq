import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

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

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("research-run (Blade example)", () => {
  it("renders the answer, its citations and the evidence lists", async () => {
    const host = await mount(rendered("research-run"));
    expect(host.querySelector('[data-slot="research-answer"]')).not.toBeNull();
    expect([...host.querySelectorAll('button[data-evidence]')].map((b) => b.getAttribute("aria-label"))).toEqual(["Show evidence 1", "Show evidence 2"]);
    expect(host.querySelectorAll("[data-evidence-id]")).toHaveLength(3);
    expect(host.querySelector('ol[aria-label="Also found"] [data-evidence-id]')?.getAttribute("data-evidence-id")).toBe("e3");
    expect(host.querySelector('[data-slot="research-progress"]')).toBeNull();
  });

  it("highlights the evidence a citation points at", async () => {
    const host = await mount(rendered("research-run"));
    const cites = host.querySelectorAll<HTMLButtonElement>("button[data-evidence]");
    expect(cites[1]!.getAttribute("aria-pressed")).toBe("false");
    cites[1]!.click();
    await tick();
    expect(cites[1]!.getAttribute("aria-pressed")).toBe("true");
    expect(cites[0]!.getAttribute("aria-pressed")).toBe("false");
    expect(host.querySelector('[data-evidence-id="e2"]')!.hasAttribute("data-active")).toBe(true);
    expect(host.querySelector('[data-evidence-id="e1"]')!.hasAttribute("data-active")).toBe(false);
  });

  it("asks on Ctrl+Enter and shows the error the listener hands back", async () => {
    const host = await mount(rendered("research-run"));
    const root = host.querySelector<HTMLElement>('[data-slot="research-run"]')!;
    const asked = vi.fn();
    root.addEventListener("nq-research-ask", (e) => {
      const d = (e as CustomEvent).detail;
      asked(d.question);
      d.waitUntil(Promise.resolve({ error: "Quota reached" }));
    });
    const box = host.querySelector<HTMLTextAreaElement>("textarea")!;
    const submit = host.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(submit.disabled).toBe(true);
    box.value = "  What changed?  ";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(submit.disabled).toBe(false);
    box.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));
    await tick();
    expect(asked).toHaveBeenCalledWith("What changed?");
    expect(host.querySelector('[role="alert"]')!.textContent).toBe("Quota reached");
    expect(submit.disabled).toBe(false);
  });

  it("fires stop and retry events", async () => {
    const running = await mount(rendered("research-run"));
    const root = running.querySelector<HTMLElement>('[data-slot="research-run"]')!;
    const seen: string[] = [];
    root.addEventListener("nq-research-cancel", () => seen.push("cancel"));
    root.addEventListener("nq-research-retry", (e) => seen.push(`retry:${(e as CustomEvent).detail.question}`));
    const data = Alpine.$data(root) as { cancel(): void; retry(): void };
    data.cancel();
    data.retry();
    expect(seen).toEqual(["cancel", "retry:Why did churn fall in Q3?"]);
  });
});
