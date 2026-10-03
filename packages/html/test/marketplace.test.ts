// The Blade marketplace example (packages/php/examples/rendered/marketplace.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { hostOf, validateDraft } from "../src/alpine/marketplace-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const attr = (el: Element, name: string) => [...el.attributes].find((a) => a.name === name)?.value ?? null;
const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms));

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

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("marketplace");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
const page = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="marketplace-detail"]');
const button = (root: ParentNode, text: string) => [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === text)!;

describe("marketplace logic", () => {
  it("validates a draft like the React component", () => {
    const draft = { name: "", summary: "", description: "", category: "", version: "x", repository: "http://a", price: 0, tags: [], permissions: [] };
    expect(validateDraft(draft)).toMatchObject({ name: "required", summary: "required", category: "required", version: "invalid", repository: "invalid" });
    expect(validateDraft({ ...draft, name: "A", summary: "s", category: "c", version: "1.0.0", repository: "https://github.com/a/b" })).toEqual({});
  });

  it("finds the host of a teleported part", () => {
    const placeholder = document.createElement("template");
    const clone = document.createElement("div");
    const inner = document.createElement("span");
    clone.append(inner);
    (clone as unknown as { _x_teleportBack: Element })._x_teleportBack = placeholder;
    expect(hostOf(inner)).toBe(placeholder);
  });
});

describe("marketplace (Blade example)", () => {
  it("renders the featured strip and the store, and opens a page and goes back", async () => {
    const host = await mount();
    expect(host.querySelector('[data-slot="marketplace"]')).not.toBeNull();
    expect(host.querySelectorAll("[data-featured]")).toHaveLength(1);
    expect(page(host)).toBeNull();
    const changes: (string | null)[] = [];
    host.addEventListener("nq-selected-change", ((e: CustomEvent) => changes.push(e.detail.id)) as unknown as EventListener);
    host.querySelector<HTMLElement>('[data-featured="runner"] button')!.click();
    await tick();
    expect(page(host)!.dataset.listing).toBe("runner");
    expect(page(host)!.textContent).toContain("by Nasaq");
    expect(page(host)!.textContent).toContain("Change your projects");
    button(page(host)!, "Back to the store").click();
    await tick();
    expect(page(host)).toBeNull();
    expect(changes).toEqual(["runner", null]);
  });

  it("opens a page from a card (select mode)", async () => {
    const host = await mount();
    host.querySelector<HTMLElement>('[data-slot="catalog-card"][data-item="charts"] h3 button')!.click();
    await tick();
    expect(page(host)!.dataset.listing).toBe("charts");
  });

  it("installs from the page, stays busy until wait() settles, and the store follows", async () => {
    const host = await mount();
    let resolveIt: () => void = () => {};
    let seen = "";
    host.addEventListener("nq-install", ((e: CustomEvent) => {
      if (!e.detail.wait) return;
      seen = e.detail.id;
      e.detail.wait(new Promise<void>((r) => (resolveIt = r)));
    }) as EventListener);
    host.querySelector<HTMLElement>('[data-featured="runner"] button')!.click();
    await tick();
    const install = page(host)!.querySelector<HTMLButtonElement>('[data-slot="install-button"]')!;
    install.click();
    await tick();
    expect(seen).toBe("runner");
    expect(attr(install, "aria-busy")).toBe("true");
    resolveIt();
    await tick();
    expect(visible(install)).toBe(false);
    const open = page(host)!.querySelectorAll<HTMLElement>('[data-slot="install-button"]')[1]!;
    expect(visible(open)).toBe(true);
    button(page(host)!, "Back to the store").click();
    await tick();
    expect(attr(host.querySelector('[data-slot="catalog-card"][data-item="runner"]')!, "data-state")).toBe("installed");
  });

  it("shows a failed install on the page", async () => {
    const host = await mount();
    host.addEventListener("nq-install", ((e: CustomEvent) => e.detail.wait?.(Promise.resolve({ error: "Quota reached" }))) as EventListener);
    host.querySelector<HTMLElement>('[data-featured="runner"] button')!.click();
    await tick();
    page(host)!.querySelector<HTMLButtonElement>('[data-slot="install-button"]')!.click();
    await tick(80);
    const alert = [...page(host)!.querySelectorAll<HTMLElement>('[role="alert"]')].find((a) => a.textContent === "Quota reached");
    expect(alert).toBeDefined();
    expect(visible(alert!)).toBe(true);
  });

  it("switches to the template gallery, filters it and uses a template", async () => {
    const host = await mount();
    const toggles = [...host.querySelectorAll<HTMLElement>('[data-slot="toggle"]')];
    toggles.find((t) => t.textContent!.includes("Templates"))!.click();
    await tick();
    const gallery = host.querySelector<HTMLElement>('[data-slot="template-gallery"]')!;
    expect(visible(gallery.parentElement)).toBe(true);
    let used = "";
    host.addEventListener("nq-use-template", ((e: CustomEvent) => {
      used = e.detail.id;
      e.detail.wait(Promise.resolve({ error: "Nope" }));
    }) as EventListener);
    button(gallery, "Use template").click();
    await tick(80);
    expect(used).toBe("t1");
    const alert = gallery.querySelector<HTMLElement>('p[role="alert"]')!;
    expect(alert.textContent).toBe("Nope");
    expect(visible(alert)).toBe(true);
    const chips = [...gallery.querySelectorAll<HTMLElement>('[data-slot="chip"]')];
    chips.find((c) => c.textContent!.trim() === "Data")!.click();
    await tick();
    expect(visible(gallery.querySelector('[data-template="t1"]')!.closest("li"))).toBe(false);
  });

  it("blocks an empty publish and sends a valid one", async () => {
    const host = await mount();
    button(host, "Publish").click();
    await tick();
    const form = document.querySelector<HTMLFormElement>('[data-slot="publish-form"] form')!;
    expect(form).not.toBeNull();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(form.textContent).toContain("This is required.");
    let sent: { name: string; version: string; price: number } | null = null;
    host.addEventListener("nq-publish", ((e: CustomEvent) => (sent = e.detail.draft)) as EventListener);
    const fill = async (selector: string, value: string) => {
      const input = form.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await tick();
    };
    const inputs = [...form.querySelectorAll<HTMLInputElement>('input[data-slot="input"]')];
    const [name, summary, version, repo] = inputs;
    for (const [el, v] of [[name, "My ext"], [summary, "Does a thing"], [version, "1.0.0"], [repo, "https://github.com/acme/ext"]] as const) {
      el!.value = v;
      el!.dispatchEvent(new Event("input", { bubbles: true }));
    }
    await tick();
    const trigger = form.querySelector<HTMLElement>('[data-slot="select-trigger"]')!;
    trigger.click();
    await tick();
    document.querySelector<HTMLElement>('[data-slot="select-item"]')!.click();
    await tick();
    void fill;
    form.querySelectorAll<HTMLElement>("[data-slot=checkbox]")[1]?.click();
    await tick();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(sent).toMatchObject({ name: "My ext", version: "1.0.0", price: 0, permissions: ["write"] });
    expect(form.parentElement!.querySelector('[role="status"]')!.textContent).toContain("Sent for review");
  });
});
