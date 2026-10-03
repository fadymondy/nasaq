// The Blade integration-connector example (packages/php/examples/rendered/integration-connector.html) under real Alpine.
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
  // The example answers every event itself; tests wire their own listeners, so strip those handlers.
  host.innerHTML = rendered("integration-connector").replace(/x-on:nq-(connect|disconnect|select-account)="[^"]*"/g, "");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  const root = host.querySelector<HTMLElement>('[data-slot="integration-connector"]')!;
  return { host, root };
}

const card = (root: HTMLElement, id: string) => root.querySelector<HTMLElement>(`[data-slot="integration-service"][data-service="${id}"]`)!;
const shown = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
// Every card has its own (closed) alert dialog in the DOM: pick the confirm button of the one with this title.
const confirmFor = (title: string) => [...document.querySelectorAll("[data-slot=\"alert-dialog-title\"]")].find((t) => t.textContent === title)!.closest("[data-slot=\"alert-dialog-content\"]")!.querySelector<HTMLButtonElement>("[data-slot=\"confirm-button-action\"]")!;
const button = (scope: ParentNode, text: string) => [...scope.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim().startsWith(text) && (b as HTMLElement).style.display !== "none")!;

describe("integration-connector (Blade example)", () => {
  it("renders groups, per-state status and actions", async () => {
    const { root } = await mount();
    expect(root.querySelector("h2")!.textContent).toBe("Connections");
    expect([...root.querySelectorAll("section > h3")].map((h) => h.textContent)).toEqual(["Google", "Developer tools"]);
    const cards = [...root.querySelectorAll<HTMLElement>('[data-slot="integration-service"]')];
    expect(cards.map((c) => c.dataset.status)).toEqual(["disconnected", "connected", "error"]);
    const visibleStatus = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('[data-slot="status"]')].filter(shown).map((s) => s.textContent?.trim());
    expect(visibleStatus(cards[0]!)).toEqual(["Not connected"]);
    expect(visibleStatus(cards[1]!)).toEqual(["Connected"]);
    expect(visibleStatus(cards[2]!)).toEqual(["Connection problem"]);
    expect(shown(cards[0]!.querySelector("dl"))).toBe(false);
    expect(shown(cards[1]!.querySelector("dl"))).toBe(true);
    expect(cards[1]!.textContent).toContain("fady@example.com");
    expect(cards[1]!.textContent).toContain("1 permission");
    expect(button(cards[0]!, "Connect")).toBeTruthy();
    expect(button(cards[1]!, "Change permissions")).toBeTruthy();
    expect(button(cards[2]!, "Reconnect")).toBeTruthy();
    expect(shown(cards[2]!.querySelector('[data-slot="alert"][data-tone="danger"]'))).toBe(true);
    expect(cards[1]!.querySelector('[data-slot="select-trigger"]')!.getAttribute("aria-label")).toBe("Analytics: Account");
  });

  it("shows the consent dialog and fires nq-connect with the ticked scope ids", async () => {
    const { root } = await mount();
    let detail: { id: string; scopeIds: string[] } | undefined;
    root.addEventListener("nq-connect", (e) => {
      const d = (e as CustomEvent).detail;
      detail = { id: d.id, scopeIds: d.scopeIds };
      d.wait(Promise.resolve());
    });
    button(card(root, "search-console"), "Connect").click();
    await tick(80);
    const dialog = document.querySelector<HTMLElement>('[data-slot="integration-connect-dialog"]')!;
    expect(dialog.querySelector('[data-slot="dialog-title"]')!.textContent).toBe("Connect Search Console");
    const boxes = [...dialog.querySelectorAll<HTMLButtonElement>('[data-slot="checkbox"]')];
    expect(boxes.map((b) => b.getAttribute("aria-checked"))).toEqual(["true", "true"]);
    expect(boxes[0]!.disabled).toBe(true);
    expect(dialog.textContent).toContain("Required");
    boxes[1]!.click();
    await tick();
    dialog.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    expect(detail).toEqual({ id: "search-console", scopeIds: ["read"] });
    // The card flips to connected and the dialog closes.
    expect(card(root, "search-console").dataset.status).toBe("connected");
    expect(button(card(root, "search-console"), "Change permissions")).toBeTruthy();
    expect(shown(card(root, "search-console").querySelector("dl"))).toBe(true);
    expect(card(root, "search-console").textContent).toContain("Just now");
    expect(card(root, "search-console").textContent).toContain("1 permission");
    await tick(300);
    expect(shown(document.querySelector('form[data-slot="integration-connect-dialog"]')!.closest('[data-slot="dialog-content"]'))).toBe(false);
  });

  it("keeps the dialog open and shows the error from nq-connect", async () => {
    const { root } = await mount();
    root.addEventListener("nq-connect", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Popup blocked" })));
    button(card(root, "search-console"), "Connect").click();
    await tick(80);
    document.querySelector("form[data-slot='integration-connect-dialog']")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    const dialog = document.querySelector<HTMLElement>('[data-slot="integration-connect-dialog"]')!;
    expect(dialog.textContent).toContain("Popup blocked");
    expect(card(root, "search-console").dataset.status).toBe("disconnected");
  });

  it("asks before disconnecting, then fires nq-disconnect and flips the card", async () => {
    const { root } = await mount();
    let id: unknown;
    root.addEventListener("nq-disconnect", (e) => {
      id = (e as CustomEvent).detail.id;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    button(card(root, "analytics"), "Disconnect").click();
    await tick(80);
    expect(id).toBeUndefined();
    const title = [...document.querySelectorAll('[data-slot="alert-dialog-title"]')].find((t) => t.textContent === "Disconnect Analytics?");
    expect(title!.textContent).toBe("Disconnect Analytics?");
    confirmFor("Disconnect Analytics?").click();
    await tick(80);
    expect(id).toBe("analytics");
    expect(card(root, "analytics").dataset.status).toBe("disconnected");
    expect(shown(card(root, "analytics").querySelector("dl"))).toBe(false);
  });

  it("shows the error from nq-disconnect above the cards and leaves the card connected", async () => {
    const { root } = await mount();
    root.addEventListener("nq-disconnect", (e) => (e as CustomEvent).detail.wait(Promise.reject(new Error("boom"))));
    button(card(root, "analytics"), "Disconnect").click();
    await tick(80);
    confirmFor("Disconnect Analytics?").click();
    await tick(80);
    expect(card(root, "analytics").dataset.status).toBe("connected");
    const alert = [...root.querySelectorAll<HTMLElement>(':scope [data-slot="alert"]')].find((a) => shown(a) && a.textContent?.includes("Something went wrong"));
    expect(alert).toBeTruthy();
  });
});
