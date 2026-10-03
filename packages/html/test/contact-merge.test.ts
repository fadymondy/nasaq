// The Blade contact-merge example (packages/php/examples/rendered/contact-merge.html) under real Alpine.
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
  // The example answers nq-merge itself; tests wire their own listener.
  host.innerHTML = rendered("contact-merge").replace(/x-on:nq-merge="[^"]*"/g, "");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  const root = host.querySelector<HTMLElement>('[data-slot="contact-merge"]')!;
  return { host, root };
}

const result = (root: HTMLElement) => root.querySelector('[data-slot="contact-merge-result"]')!.textContent!.replace(/\s+/g, " ").trim();
const cards = (scope: ParentNode) => [...scope.querySelectorAll<HTMLElement>('[data-slot="radio-card"]')];
const buttonByText = (scope: ParentNode, text: string) => [...scope.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.replace(/\s+/g, " ").trim() === text)!;

describe("contact-merge (Blade example)", () => {
  it("asks only about the fields that differ and lists the identical ones apart", async () => {
    const { root } = await mount();
    expect(root.querySelector("h3")!.textContent).toBe("3 fields differ");
    expect(root.querySelectorAll('[data-slot="contact-merge-field"]')).toHaveLength(3);
    expect(root.querySelector("details")!.textContent).toContain("Email");
    expect(root.textContent).toContain("Combine all");
  });

  it("renders the after-merge panel live, with tags combined", async () => {
    const { root } = await mount();
    const text = result(root);
    expect(text).toContain("Sara Alharbi");
    expect(text).toContain("Designer");
    expect(text).toContain("vip");
    expect(text).toContain("lead");
  });

  it("shows what moves over and the safest consent", async () => {
    const { root } = await mount();
    expect(root.textContent).toContain("Deals: 3");
    expect(root.textContent).toContain("Linked accounts: 2");
    expect(root.textContent).toContain("Opted out");
    expect(root.textContent).toContain("If any record opted out");
  });

  it("choosing a value in a field updates the result", async () => {
    const { root } = await mount();
    const nameGroup = root.querySelectorAll<HTMLElement>('[data-slot="contact-merge-field"]')[0]!;
    cards(nameGroup)[1]!.click();
    await tick();
    expect(result(root)).toContain("Sara Al-Harbi");
    expect(result(root)).not.toContain("Sara Alharbi");
  });

  it("switching the survivor moves the untouched fields to it", async () => {
    const { root } = await mount();
    const survivorGroup = root.querySelector<HTMLElement>('[data-slot="radio-group"]')!;
    cards(survivorGroup)[1]!.click();
    await tick();
    expect(result(root)).toContain("Sara Al-Harbi");
    expect(result(root)).toContain("+966 55 987 6543");
  });

  it("confirms, then fires nq-merge with the outcome and closes when it resolves", async () => {
    const { root } = await mount();
    const seen: Record<string, unknown>[] = [];
    root.addEventListener("nq-merge", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push({ survivorId: d.survivorId, mergedIds: d.mergedIds, values: d.values });
      d.waitUntil(Promise.resolve());
    });
    buttonByText(root, "Merge 2 contacts").click();
    await tick(100);
    const dialog = document.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!;
    expect(dialog.textContent).toContain("Merge into Sara Alharbi?");
    expect(dialog.textContent).toContain("The other record is deleted.");
    buttonByText(dialog, "Merge").click();
    await tick(100);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.survivorId).toBe("c1");
    expect(seen[0]!.mergedIds).toEqual(["c2"]);
    expect((seen[0]!.values as Record<string, unknown>).tags).toEqual(["vip", "lead"]);
    await tick(300);
    expect(document.querySelector('[data-slot="alert-dialog-content"]')!.hasAttribute("data-open")).toBe(false);
  });

  it("keeps the dialog and shows the error when the host answers with one", async () => {
    const { root } = await mount();
    root.addEventListener("nq-merge", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({ error: "Locked by another user." })));
    buttonByText(root, "Merge 2 contacts").click();
    await tick(100);
    const dialog = document.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!;
    buttonByText(dialog, "Merge").click();
    await tick(100);
    const alert = [...dialog.querySelectorAll<HTMLElement>('[data-slot="alert"]')][0]!;
    expect(alert.textContent).toContain("Locked by another user.");
    expect(alert.style.display).not.toBe("none");
    expect(document.querySelector('[data-slot="alert-dialog-content"]')!.hasAttribute("data-open")).toBe(true);
  });

  it("a rejection shows the failed message", async () => {
    const { root } = await mount();
    root.addEventListener("nq-merge", (e) => (e as CustomEvent).detail.waitUntil(Promise.reject(new Error("x"))));
    buttonByText(root, "Merge 2 contacts").click();
    await tick(100);
    const dialog = document.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!;
    buttonByText(dialog, "Merge").click();
    await tick(100);
    expect(dialog.textContent).toContain("The merge did not go through. Nothing was changed.");
  });

  it("the Cancel button fires nq-cancel", async () => {
    const { root } = await mount();
    let cancelled = false;
    root.addEventListener("nq-cancel", () => (cancelled = true));
    buttonByText(root, "Cancel").click();
    expect(cancelled).toBe(true);
  });
});
