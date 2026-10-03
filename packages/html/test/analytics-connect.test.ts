// The Blade analytics-connect example (packages/php/examples/rendered/analytics-connect.html) under real Alpine.
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
  host.innerHTML = rendered("analytics-connect").replace(/x-on:nq-(connect|disconnect|refresh)="[^"]*"/g, "");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  const connect = host.querySelector<HTMLElement>('[data-slot="analytics-connect"]')!;
  const page = host.querySelector<HTMLElement>('[data-slot="analytics-page"]')!;
  return { host, connect, page };
}

const button = (scope: ParentNode, text: string) => [...scope.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text)!;

describe("analytics-connect (Blade example)", () => {
  it("renders the connect screen: heading, benefits, one connector card, read-only note", async () => {
    const { connect } = await mount();
    expect(connect.dataset.status).toBe("disconnected");
    expect(connect.getAttribute("aria-label")).toBe("Connect Google Analytics");
    expect(connect.querySelector("h2")!.textContent).toBe("Connect Google Analytics");
    expect(connect.textContent).toContain("Nasaq reads your Google Analytics data");
    expect([...connect.querySelectorAll("ul")[0]!.querySelectorAll("li")].map((li) => li.textContent?.trim())).toEqual([
      "Users and sessions against the previous period",
      "Sources and top pages",
    ]);
    expect(connect.querySelectorAll('[data-slot="integration-service"]')).toHaveLength(1);
    expect(connect.textContent).toContain("Read-only access");
  });

  it("connect fires nq-connect from the connector inside the screen", async () => {
    const { connect } = await mount();
    let detail: { id: string; scopeIds: string[] } | undefined;
    connect.addEventListener("nq-connect", (e) => {
      const d = (e as CustomEvent).detail;
      detail = { id: d.id, scopeIds: d.scopeIds };
      d.wait(Promise.resolve());
    });
    button(connect, "Connect").click();
    await tick(80);
    const dialog = document.querySelector<HTMLElement>('form[data-slot="integration-connect-dialog"]')!;
    expect(dialog.textContent).toContain("See your Google Analytics reports");
    dialog.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    expect(detail).toEqual({ id: "ga", scopeIds: ["analytics.readonly"] });
    expect(connect.querySelector<HTMLElement>('[data-slot="integration-service"]')!.dataset.status).toBe("connected");
  });

  it("the page frame shows the source line, the actions and the report when connected", async () => {
    const { page } = await mount();
    expect(page.dataset.connected).toBe("true");
    expect(page.querySelector("h1")!.textContent).toBe("Google Analytics");
    expect(page.textContent).toContain("Nasaq blog");
    expect(page.textContent).toContain("Connected to");
    expect(page.querySelector("bdi")!.textContent).toBe("fady@example.com");
    expect(page.textContent).toContain("Updated");
    expect(page.querySelector("time")!.textContent).toContain("5 minutes ago");
    expect(page.textContent).toContain("30 days");
    expect(page.textContent).toContain("The report goes here.");
    expect(page.querySelector('[data-slot="analytics-connect"]')).toBeNull();
  });

  it("refresh fires nq-refresh and is busy until the promise settles", async () => {
    const { page } = await mount();
    let release!: () => void;
    let fired = 0;
    page.addEventListener("nq-refresh", (e) => {
      fired += 1;
      (e as CustomEvent).detail.wait(new Promise<void>((r) => (release = r)));
    });
    const refresh = button(page, "Refresh");
    expect(refresh.disabled).toBe(false);
    expect(refresh.getAttribute("aria-busy")).toBeNull();
    refresh.click();
    await tick();
    expect(fired).toBe(1);
    expect(refresh.disabled).toBe(true);
    expect(refresh.getAttribute("aria-busy")).toBe("true");
    refresh.click();
    await tick();
    expect(fired).toBe(1);
    release();
    await tick();
    expect(refresh.disabled).toBe(false);
    expect(refresh.getAttribute("aria-busy")).toBeNull();
  });

  it("asks before disconnecting, then fires nq-disconnect with the service id", async () => {
    const { page } = await mount();
    let id: unknown;
    page.addEventListener("nq-disconnect", (e) => {
      id = (e as CustomEvent).detail.id;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    button(page, "Disconnect").click();
    await tick(80);
    expect(id).toBeUndefined();
    const title = [...document.querySelectorAll('[data-slot="alert-dialog-title"]')].filter((t) => t.textContent === "Disconnect Google Analytics?").at(-1)!;
    expect(title).toBeTruthy();
    expect(title.closest('[data-slot="alert-dialog-content"]')!.hasAttribute("data-open")).toBe(true);
    title.closest('[data-slot="alert-dialog-content"]')!.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-action"]')!.click();
    await tick(80);
    expect(id).toBe("ga");
  });
});
