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

const row = (host: HTMLElement, id: string) => host.querySelector<HTMLElement>(`[data-slot="connected-account"][data-provider="${id}"]`)!;
const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

describe("connected-accounts (Blade example)", () => {
  it("renders one row per provider with the connected state", async () => {
    const host = await mount(rendered("connected-accounts"));
    const rows = [...host.querySelectorAll<HTMLElement>('[data-slot="connected-account"]')];
    expect(rows.map((r) => r.dataset.provider)).toEqual(["google", "github", "apple", "microsoft"]);
    expect(row(host, "google").hasAttribute("data-connected")).toBe(true);
    expect(row(host, "apple").hasAttribute("data-connected")).toBe(false);
    expect(row(host, "google").textContent).toContain("fady@example.com");
  });

  it("Connect dispatches nq-connect, shows the pending state and flips the row when the promise resolves", async () => {
    const host = await mount(rendered("connected-accounts"));
    const events: string[] = [];
    host.addEventListener("nq-connect", (e) => {
      events.push((e as CustomEvent).detail.id);
      (e as CustomEvent).detail.wait(new Promise((r) => setTimeout(() => r({ account: "me@apple.test" }), 40)));
    });
    const apple = row(host, "apple");
    const connect = [...apple.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.includes("Connect"))!;
    connect.click();
    await tick(10);
    expect(events).toEqual(["apple"]);
    expect(apple.querySelector('[data-slot="spinner"]')).not.toBeNull();
    await tick(80);
    expect(apple.hasAttribute("data-connected")).toBe(true);
    expect(apple.textContent).toContain("me@apple.test");
  });

  it("a { error } result keeps the row unconnected and shows the alert", async () => {
    const host = await mount(rendered("connected-accounts"));
    host.addEventListener("nq-connect", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Denied by provider" })));
    const microsoft = row(host, "microsoft");
    [...microsoft.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.includes("Connect"))!.click();
    await tick();
    expect(microsoft.hasAttribute("data-connected")).toBe(false);
    expect(host.textContent).toContain("Denied by provider");
  });

  it("Disconnect asks first, then dispatches nq-disconnect and flips the row", async () => {
    const host = await mount(rendered("connected-accounts"));
    const events: string[] = [];
    host.addEventListener("nq-disconnect", (e) => {
      events.push((e as CustomEvent).detail.id);
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    const github = row(host, "github");
    github.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')!.click();
    await tick(60);
    expect(events).toEqual([]);
    const action = openAction();
    expect(action).not.toBeNull();
    action.click();
    await tick(60);
    expect(events).toEqual(["github"]);
    expect(github.hasAttribute("data-connected")).toBe(false);
  });

  it("the last remaining method cannot be disconnected: the button is disabled and a hint shows", async () => {
    const host = await mount(rendered("connected-accounts"));
    host.addEventListener("nq-disconnect", (e) => (e as CustomEvent).detail.wait(Promise.resolve()));
    const google = row(host, "google");
    expect(visible(google.querySelector("p[id]"))).toBe(false);
    row(host, "github").querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')!.click();
    await tick(60);
    openAction().click();
    await tick(60);
    // Google plus one other method is 2; github is gone, so total is 2. Drop the other method by flipping the state.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Alpine.$data(host.querySelector('[data-slot="connected-accounts"]')!) as any).others = 0;
    await tick();
    expect(visible(google.querySelector("p[id]"))).toBe(true);
    expect(google.querySelector('button[aria-disabled="true"]')).not.toBeNull();
  });
});

// Dialog content is teleported to <body> and stays there closed; the open one is not hidden.
function openAction(): HTMLButtonElement {
  const open = [...document.querySelectorAll<HTMLElement>('[data-slot="alert-dialog-content"]')].filter((c) => c.getAttribute("data-open") !== null || c.getAttribute("data-state") === "open" || (c.style.display !== "none" && !c.hidden));
  return open.at(-1)!.querySelector<HTMLButtonElement>('[data-slot="confirm-button-action"]')!;
}
