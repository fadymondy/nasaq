// The Blade model-routing-editor example (packages/php/examples/rendered/model-routing-editor.html) under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const waitable = (root: HTMLElement, name: string, make: (detail: any) => Promise<unknown>, seen: any[] = []) => {
  root.addEventListener(name, (e) => {
    const d = (e as CustomEvent).detail;
    seen.push(d);
    d.waitUntil(make(d));
  });
  return seen;
};
const shown = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

async function setupRoot() {
  const host = await mount("model-routing-editor");
  const root = host.querySelector<HTMLFormElement>('[data-slot="model-routing-editor"]')!;
  const status = () => root.querySelector('[role="status"]')!.textContent!.trim();
  const save = () => [...root.querySelectorAll<HTMLButtonElement>('[data-slot="routing-footer"] button')].find((b) => b.type === "submit")!;
  const discard = () => [...root.querySelectorAll<HTMLButtonElement>('[data-slot="routing-footer"] button')].find((b) => b.type === "button")!;
  const route = (task: string) => root.querySelector<HTMLElement>(`[data-slot="routing-route"][data-task="${task}"]`)!;
  return { host, root, status, save, discard, route };
}

/** Open a select trigger and pick the item with this text. */
async function pick(trigger: HTMLElement, text: string) {
  trigger.click();
  await tick(60);
  const item = [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')].filter((i) => shown(i.closest("[data-slot=select-content]"))).find((i) => i.textContent?.trim() === text)!;
  item.click();
  await tick(60);
}

describe("model-routing-editor (Blade example)", () => {
  it("renders the routes, the providers and the footer", async () => {
    const { root, status, save, discard } = await setupRoot();
    expect(root.querySelectorAll('[data-slot="routing-route"]')).toHaveLength(2);
    const providers = [...root.querySelectorAll<HTMLElement>('[data-slot="routing-provider"]')];
    expect(providers).toHaveLength(2);
    expect(providers.map((p) => p.hasAttribute("data-active"))).toEqual([true, false]);
    expect(providers[0]!.textContent).toContain("Online");
    expect(providers[1]!.textContent).toContain("Node");
    expect(root.querySelector('[data-slot="routing-route"][data-task="vision"]')!.textContent).toContain("Vision");
    expect(root.querySelector<HTMLElement>('[data-slot="routing-route"][data-task="chat"] [data-slot="select-trigger"]')!.getAttribute("aria-label")).toBe("Chat: Model");
    expect(status()).toBe("");
    expect(save().hasAttribute("disabled")).toBe(true);
    expect(discard().hasAttribute("disabled")).toBe(true);
  });

  it("becomes dirty when auto is toggled, saves with the value, and discards", async () => {
    const { root, status, save, discard } = await setupRoot();
    const seen = waitable(root, "nq-routing-save", () => Promise.resolve());
    const auto = root.querySelector<HTMLElement>('[data-slot="switch"]')!;
    auto.click();
    await tick(60);
    expect(status()).toBe("Unsaved routing changes");
    expect(save().hasAttribute("disabled")).toBe(false);
    discard().click();
    await tick(60);
    expect(status()).toBe("");
    expect(auto.getAttribute("aria-checked")).toBe("false");
    auto.click();
    await tick(60);
    root.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    expect(seen).toHaveLength(1);
    expect(seen[0].value).toEqual({
      auto: true,
      routes: { chat: { model: "sonnet", fallback: "haiku" }, vision: { model: "sonnet", fallback: undefined } },
      backend: "cloud",
    });
    expect(status()).toBe("Saved");
  });

  it("shows the host's failure", async () => {
    const { root } = await setupRoot();
    waitable(root, "nq-routing-save", () => Promise.resolve({ error: "Nope" }));
    root.querySelector<HTMLElement>('[data-slot="switch"]')!.click();
    await tick(60);
    root.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    expect(root.textContent).toContain("Nope");
  });

  it("marks a fallback equal to the model, and changes the active backend", async () => {
    const { root, route } = await setupRoot();
    await pick(route("chat").querySelectorAll<HTMLElement>('[data-slot="select-trigger"]')[1]!, "Sonnet");
    const err = [...route("chat").querySelectorAll<HTMLElement>('[data-slot="field-error"]')].filter(shown).map((e) => e.textContent?.trim());
    expect(err).toContain("The fallback must differ from the model.");
    expect(route("chat").hasAttribute("data-invalid")).toBe(true);
    const edge = [...root.querySelectorAll<HTMLElement>('[data-slot="toggle-group"] button')].find((b) => b.textContent?.includes("Edge node"))!;
    edge.click();
    await tick(60);
    const providers = [...root.querySelectorAll<HTMLElement>('[data-slot="routing-provider"]')];
    expect(providers.map((p) => p.hasAttribute("data-active"))).toEqual([false, true]);
  });

  it("blocks save while a route has no model", async () => {
    const { root, route } = await setupRoot();
    const seen = waitable(root, "nq-routing-save", () => Promise.resolve());
    const data = (window as any).Alpine.$data(root);
    data.rows[1].model = null;
    await tick(40);
    root.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(60);
    expect(seen).toHaveLength(0);
    expect(root.textContent).toContain("Fix the routes marked below to save.");
    expect(route("vision").hasAttribute("data-invalid")).toBe(true);
  });

  it("validates the register dialog, then fires nq-routing-register", async () => {
    const { root } = await setupRoot();
    const seen = waitable(root, "nq-routing-register", () => Promise.resolve());
    const open = [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("Register provider"))!;
    open.click();
    await tick(80);
    const form = document.querySelector<HTMLFormElement>('[data-slot="routing-register"]')!;
    expect(form).toBeTruthy();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(seen).toHaveLength(0);
    const errs = () => [...form.querySelectorAll<HTMLElement>('[role="alert"]')].filter(shown).map((e) => e.textContent?.trim());
    expect(errs()).toContain("Enter a name.");
    expect(errs()).toContain("Enter the endpoint URL.");
    const [name, endpoint] = form.querySelectorAll<HTMLInputElement>("input:not([type=hidden])");
    type(name!, "cloud api");
    type(endpoint!, "nope");
    await tick();
    expect(errs()).toContain("A provider with this name already exists.");
    expect(errs()).toContain("Enter a full address starting with http:// or https://.");
    type(name!, "Edge 2");
    type(endpoint!, "https://edge2.example.com");
    await tick();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ name: "Edge 2", kind: "cloud", endpoint: "https://edge2.example.com", modalities: ["text"] });
    await tick(300);
    expect(shown(form.closest('[data-slot="dialog-content"]'))).toBe(false);
  });

  it("keeps the dialog open with the host's error", async () => {
    const { root } = await setupRoot();
    waitable(root, "nq-routing-register", () => Promise.resolve({ error: "Endpoint unreachable" }));
    [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("Register provider"))!.click();
    await tick(80);
    const form = document.querySelector<HTMLFormElement>('[data-slot="routing-register"]')!;
    const [name, endpoint] = form.querySelectorAll<HTMLInputElement>("input:not([type=hidden])");
    type(name!, "Another");
    type(endpoint!, "https://a.example.com");
    await tick();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    expect(form.textContent).toContain("Endpoint unreachable");
    expect(shown(form.closest('[data-slot="dialog-content"]'))).toBe(true);
  });

  it("fires nq-routing-remove-provider", async () => {
    const { root } = await setupRoot();
    const seen = waitable(root, "nq-routing-remove-provider", () => Promise.resolve());
    root.querySelector<HTMLButtonElement>('button[aria-label="Remove Edge node"]')!.click();
    await tick(60);
    expect(seen).toHaveLength(1);
    expect(seen[0].id).toBe("edge");
  });
});
