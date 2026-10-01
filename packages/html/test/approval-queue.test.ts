import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

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

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const rows = () => [...document.querySelectorAll<HTMLElement>('[data-slot="approval-item"]')];
const btn = (label: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.getAttribute("aria-label") === label)!;

describe("approval-queue (Blade example)", () => {
  it("lists the pending items, masks secrets and blocks approve on unmet criteria", async () => {
    const host = await mount(rendered("approval-queue"));
    expect(rows()).toHaveLength(2);
    expect(host.textContent).not.toContain("sk-live-123");
    expect(btn("Approve Review testimonial").disabled).toBe(true);
    expect(btn("Approve Send the weekly digest").disabled).toBe(false);
  });

  it("approves, rejects with a required reason and filters", async () => {
    const host = await mount(rendered("approval-queue"));
    const root = host.querySelector<HTMLElement>('[data-slot="approval-queue"]')!;
    const seen: string[] = [];
    root.addEventListener("approve", (e) => seen.push(`approve:${(e as CustomEvent).detail.id}`));
    root.addEventListener("reject", (e) => seen.push(`reject:${(e as CustomEvent).detail.id}:${(e as CustomEvent).detail.reason}`));
    btn("Approve Send the weekly digest").click();
    await tick();
    expect(rows()).toHaveLength(1);
    btn("Reject Review testimonial").click();
    await tick(300);
    const dlg = document.querySelector<HTMLElement>('[data-slot="approval-reject"]')!;
    const submit = [...dlg.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === "Reject")!;
    submit.click();
    await tick();
    expect(dlg.querySelector<HTMLElement>('[data-slot="field-error"]')!.style.display).not.toBe("none");
    const ta = dlg.querySelector<HTMLTextAreaElement>("textarea")!;
    ta.value = "Not polite";
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    submit.click();
    await tick();
    expect(seen).toEqual(["approve:a1", "reject:a2:Not polite"]);
    expect(rows()).toHaveLength(0);
    [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((b) => b.textContent!.includes("All"))!.click();
    await tick();
    expect(rows()).toHaveLength(3);
  });
});
