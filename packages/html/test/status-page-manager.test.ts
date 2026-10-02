// The Blade example (php/examples/status-page-manager.blade.php) mounted under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { isValidStatusSlug, moveStatusItem } from "../src/alpine/status-page-manager-logic";

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


const type = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const dirtyHint = (root: HTMLElement) => root.querySelector<HTMLElement>('[x-show="dirty"]')!;
const button = (root: HTMLElement, text: string) => [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === text)!;

describe("status page helpers", () => {
  it("validates slugs and moves items", () => {
    expect(isValidStatusSlug("my-page-2")).toBe(true);
    expect(isValidStatusSlug("My Page")).toBe(false);
    expect(moveStatusItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moveStatusItem([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  });
});

describe("status-page-manager (Blade example)", () => {
  it("renders the settings, the services and the incidents", async () => {
    const host = await mountHtml(rendered("status-page-manager"));
    const root = host.querySelector<HTMLElement>('[data-slot="status-page-manager"]')!;
    expect(root.querySelector("h3")!.textContent).toBe("Status page");
    expect(root.querySelector("a")!.getAttribute("href")).toBe("https://status.nasaq.dev");
    const items = [...root.querySelectorAll('[data-slot="managed-service"]')];
    expect(items.map((i) => i.querySelector("span[dir=auto]")!.textContent)).toEqual(["API", "Website", "Database"]);
    expect(root.textContent).toContain("Elevated API latency");
    expect(button(root, "Save changes").hasAttribute("disabled")).toBe(true);
  });

  it("stages a reorder, then saves it through the save event", async () => {
    const host = await mountHtml(rendered("status-page-manager"));
    const root = host.querySelector<HTMLElement>('[data-slot="status-page-manager"]')!;
    let sent: { settings: { services: { id: string }[]; domain?: string } } | undefined;
    root.addEventListener("save", (e) => {
      const d = (e as CustomEvent).detail;
      sent = d;
      d.wait(Promise.resolve());
    });
    root.querySelector<HTMLButtonElement>('[aria-label="Move Website up"]')!.click();
    await tick();
    expect(dirtyHint(root).style.display).not.toBe("none");
    expect(root.querySelector('[data-slot="managed-service"] span[dir=auto]')!.textContent).toBe("Website");
    button(root, "Save changes").click();
    await tick(60);
    expect(sent!.settings.services.map((s) => s.id)).toEqual(["web", "api", "db"]);
    expect(sent!.settings.domain).toBe("status.nasaq.dev");
    expect(root.textContent).toContain("Saved.");
    expect(dirtyHint(root).style.display).toBe("none");
  });

  it("blocks a bad slug and shows the host's error", async () => {
    const host = await mountHtml(rendered("status-page-manager"));
    const root = host.querySelector<HTMLElement>('[data-slot="status-page-manager"]')!;
    let calls = 0;
    root.addEventListener("save", (e) => {
      calls++;
      (e as CustomEvent).detail.wait(Promise.resolve({ error: "Slug taken" }));
    });
    const slug = root.querySelectorAll<HTMLInputElement>("input")[1]!;
    type(slug, "Bad Slug");
    await tick();
    button(root, "Save changes").click();
    await tick(60);
    expect(calls).toBe(0);
    expect(root.textContent).toContain("Use lowercase letters, numbers and dashes only.");
    type(slug, "good-slug");
    await tick();
    button(root, "Save changes").click();
    await tick(60);
    expect(calls).toBe(1);
    expect(root.textContent).toContain("Slug taken");
  });

  it("posts an incident from the dialog", async () => {
    const host = await mountHtml(rendered("status-page-manager"));
    const root = host.querySelector<HTMLElement>('[data-slot="status-page-manager"]')!;
    let sent: { input: Record<string, unknown> } | undefined;
    root.addEventListener("post-incident", (e) => {
      sent = (e as CustomEvent).detail;
      sent!.input && (e as CustomEvent).detail.wait(Promise.resolve());
    });
    button(root, "Post incident").click();
    await tick(60);
    const form = document.querySelector<HTMLFormElement>("form[novalidate]")!;
    expect(form).not.toBeNull();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(40);
    expect(sent).toBeUndefined();
    expect(form.textContent).toContain("This field is required.");
    type(form.querySelector<HTMLInputElement>("input")!, "API down");
    type(form.querySelector<HTMLTextAreaElement>("textarea")!, "We are looking into it");
    const box = form.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    box.checked = true;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(60);
    expect(sent!.input).toEqual({ title: "API down", body: "We are looking into it", impact: "minor", status: "investigating", serviceIds: ["api"] });
  });
});
