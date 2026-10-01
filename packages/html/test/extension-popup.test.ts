// The Blade extension-popup example (packages/php/examples/rendered/extension-popup.html) under real Alpine.
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
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("extension-popup");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
}

const q = <T extends HTMLElement = HTMLElement>(sel: string, i = 0) => document.querySelectorAll<T>(sel)[i]!;
const popups = () => [...document.querySelectorAll<HTMLElement>('[data-slot="extension-popup"]')];
const shown = (el: HTMLElement) => el.style.display !== "none";

describe("extension-popup (Blade example)", () => {
  it("renders the frame with the brand, the status badge and the options footer", async () => {
    await mount();
    const first = popups()[0]!;
    expect(first.getAttribute("data-state")).toBe("disconnected");
    expect(first.textContent).toContain("Nasaq");
    expect(first.textContent).toContain("Not connected");
    expect(first.textContent).toContain("Options");
    expect(first.textContent).toContain("v1.4.0");
    expect(popups()[1]!.getAttribute("data-state")).toBe("connected");
  });

  it("the pause switch flips the state, swaps the badge and dispatches nq-pause-change", async () => {
    await mount();
    const events: boolean[] = [];
    document.addEventListener("nq-pause-change", (e) => events.push((e as CustomEvent).detail.paused));
    const first = popups()[0]!;
    const sw = first.querySelector<HTMLElement>('[role="switch"]')!;
    expect(sw.getAttribute("aria-label")).toBe("Pause");
    sw.click();
    await tick();
    expect(first.getAttribute("data-state")).toBe("paused");
    expect(sw.getAttribute("aria-checked")).toBe("true");
    expect(first.querySelector("header")!.textContent).toContain("Paused");
    expect(events).toEqual([true]);
    sw.click();
    await tick();
    expect(first.getAttribute("data-state")).toBe("disconnected");
    expect(events).toEqual([true, false]);
  });

  it("Options dispatches nq-open-options", async () => {
    await mount();
    let opened = 0;
    document.addEventListener("nq-open-options", () => opened++);
    [...popups()[0]!.querySelectorAll<HTMLElement>("footer button")][0]!.click();
    await tick();
    expect(opened).toBe(1);
  });

  it("the mini card shows the title, status pill, figure and hint", async () => {
    await mount();
    const card = q('[data-slot="extension-mini-card"]');
    expect(card.textContent).toContain("Saved today");
    expect(card.textContent).toContain("Synced");
    expect(card.textContent).toContain("12");
    expect(card.textContent).toContain("Pages and snippets");
  });

  it("quick actions form a named group and dispatch nq-action with the id", async () => {
    await mount();
    const group = q('[data-slot="extension-quick-actions"]');
    expect(group.getAttribute("role")).toBe("group");
    expect(group.getAttribute("aria-label")).toBe("Quick actions");
    const ids: string[] = [];
    document.addEventListener("nq-action", (e) => ids.push((e as CustomEvent).detail.id));
    group.querySelectorAll<HTMLElement>("button")[1]!.click();
    await tick();
    expect(ids).toEqual(["save"]);
  });
});

describe("extension connect (Blade example)", () => {
  const forms = () => [...document.querySelectorAll<HTMLFormElement>('[data-slot="extension-connect"]')];
  const alertOf = (f: HTMLElement) => f.querySelector<HTMLElement>('[role="alert"]')!;
  const submit = async (f: HTMLFormElement) => {
    f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(60);
  };

  it("rejects an address that is not a URL, then accepts a full one and dispatches nq-connect", async () => {
    await mount();
    const form = forms()[0]!;
    const field = form.querySelector<HTMLInputElement>("input")!;
    expect(field.getAttribute("dir")).toBe("ltr");
    expect(shown(alertOf(form))).toBe(false);
    field.value = "not a url";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await submit(form);
    expect(shown(alertOf(form))).toBe(true);
    expect(alertOf(form).textContent).toContain("Enter a full address");
    const got: { server: string }[] = [];
    document.addEventListener("nq-connect", (e) => got.push((e as CustomEvent).detail));
    field.value = "https://app.example.com";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await submit(form);
    expect(got[0]!.server).toBe("https://app.example.com");
    expect(shown(alertOf(form))).toBe(false);
  });

  it("shows an error handed back through wait() and stays busy until it settles", async () => {
    await mount();
    document.addEventListener("nq-connect", (e) => (e as CustomEvent).detail.wait(new Promise((r) => setTimeout(() => r({ error: "Could not reach that server." }), 80))));
    const form = forms()[0]!;
    const field = form.querySelector<HTMLInputElement>("input")!;
    field.value = "https://fail.example.com";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(30);
    expect(form.querySelector('[type="submit"]')!.getAttribute("aria-busy")).toBe("true");
    await tick(150);
    expect(form.querySelector('[type="submit"]')!.hasAttribute("aria-busy")).toBe(false);
    expect(alertOf(form).textContent).toContain("Could not reach that server.");
  });

  it("pair mode upper-cases the code and needs six characters", async () => {
    await mount();
    const form = forms()[1]!;
    expect(form.textContent).toContain("Pair with your account");
    const field = form.querySelector<HTMLInputElement>("input")!;
    expect(field.getAttribute("maxlength")).toBe("6");
    field.value = "abc";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    expect(field.value).toBe("ABC");
    await submit(form);
    expect(alertOf(form).textContent).toContain("The code has 6 characters");
  });
});

describe("extension options page (Blade example)", () => {
  const page = () => q('[data-slot="extension-options"]');
  const status = () => page().querySelector<HTMLElement>('[role="status"]')!;
  const saveButton = () => page().querySelector<HTMLButtonElement>("button.bg-primary, button[x-on\\:click]")!;

  it("renders the title, the section with its row, and a clean save bar", async () => {
    await mount();
    expect(page().querySelector("h1")!.textContent).toBe("Extension settings");
    expect(page().querySelector("h2")!.textContent).toBe("General");
    expect(page().querySelector('[data-slot="extension-option-row"]')!.textContent).toContain("Show badge");
    expect(status().textContent).toBe("Saved");
    expect(saveButton().disabled).toBe(true);
  });

  it("changing a control marks it dirty, Save dispatches nq-save and a clean finish marks it saved", async () => {
    await mount();
    let saves = 0;
    document.addEventListener("nq-save", (e) => {
      saves++;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    page().querySelector<HTMLElement>('[role="switch"]')!.click();
    page().dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(status().textContent).toBe("Unsaved changes");
    expect(saveButton().disabled).toBe(false);
    saveButton().click();
    await tick(60);
    expect(saves).toBe(1);
    expect(status().textContent).toBe("Saved");
    expect(saveButton().disabled).toBe(true);
  });

  it("a failed save keeps it dirty and shows the message", async () => {
    await mount();
    document.addEventListener("nq-save", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Offline" })));
    page().dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    saveButton().click();
    await tick(60);
    expect(status().textContent).toBe("Offline");
  });
});
