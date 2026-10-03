// The Blade proxy-hosts example (packages/php/examples/rendered/proxy-hosts.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { isValidUpstream, parseHosts, tlsModeAllowsWebsockets, validateProxyHost } from "../src/alpine/proxy-hosts-logic";

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
  host.innerHTML = rendered("proxy-hosts");
  document.body.append(host);
  Alpine.initTree(host);
  await tick(80);
  return host.querySelector<HTMLElement>('[data-slot="proxy-hosts"]')!;
}

type Detail = Record<string, unknown> & { wait: (p: Promise<unknown>) => void };
/** Answers the host events after the example's own listeners (the last wait() wins). */
function answer(root: HTMLElement, answers: Record<string, (d: Detail) => unknown>) {
  const seen: { name: string; detail: Detail }[] = [];
  for (const [name, fn] of Object.entries(answers)) {
    root.addEventListener(name, (e) => {
      const detail = (e as CustomEvent<Detail>).detail;
      seen.push({ name, detail });
      detail.wait(Promise.resolve().then(() => fn(detail)));
    });
  }
  return seen;
}
const data = (root: HTMLElement) => Alpine.$data(root) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
const type = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const submit = (form: HTMLElement) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
const act = (root: HTMLElement, action: string, id: string) => root.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action, row: { id } } }));
const edit = (root: HTMLElement, column: string, id: string, value: unknown) => {
  const detail: { row: { id: string }; column: string; value: unknown; promise?: Promise<unknown> } = { row: { id }, column, value };
  root.dispatchEvent(new CustomEvent("nq-data-table-edit", { bubbles: true, detail }));
  return detail.promise;
};
const text = (el: Element) => el.textContent!.replace(/\s+/g, " ").trim();
const button = (root: ParentNode, label: string) => [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(label))!;
const dialog = () => document.querySelector<HTMLFormElement>('[data-slot="proxy-host-dialog"]')!;
const ids = (root: HTMLElement) => data(root).table.rows.map((r: { id: string }) => r.id);

describe("proxy host helpers", () => {
  it("validates upstreams and hosts", () => {
    expect(isValidUpstream("http://10.0.0.5:3000")).toBe(true);
    expect(isValidUpstream("10.0.0.5")).toBe(false);
    expect(parseHosts("A.com, b.com\nA.com")).toEqual(["a.com", "b.com"]);
    expect(validateProxyHost({ hosts: [], upstream: "x" })).toEqual(["hosts", "upstream"]);
    expect(tlsModeAllowsWebsockets("passthrough")).toBe(false);
  });
});

describe("proxy-hosts (Blade example)", () => {
  it("lists hosts, upstream, status and the enabled switches", async () => {
    const root = await mount();
    expect(ids(root)).toEqual(["h1", "h2", "h3", "h4"]);
    expect(text(root)).toContain("app.example.com");
    expect(text(root)).toContain("http://10.0.0.5:3000");
    expect(text(root)).toContain("Add proxy host");
    expect(root.querySelectorAll('[data-slot="data-table"] [role="switch"], table [role="switch"]').length).toBeGreaterThanOrEqual(3);
  });

  it('folds domains past the first two into a +N more popover (as React)', async () => {
    const root = await mount();
    const more = root.querySelectorAll<HTMLElement>('[data-slot="domain-chips-more"]');
    expect(more).toHaveLength(4);
    const shop = [...more].find((m) => m.textContent!.includes('+3 more'))!;
    expect(shop).toBeTruthy();
    expect(shop.style.display).not.toBe('none');
    expect(shop.querySelector('[data-slot="popover-trigger"]')!.getAttribute('aria-label')).toBe('Show 3 more domains');
    expect(more[0]!.style.display).toBe('none');
    (shop.querySelector('[data-slot="popover-trigger"]') as HTMLElement).click();
    await tick(80);
    const hosts = [...document.body.querySelectorAll('[data-slot="popover-content"] [data-slot="domain-chip"]')].map((e) => e.textContent!.trim());
    expect(hosts).toEqual(['cdn.example.com', 'img.example.com', 'static.example.com']);
  });

  it("flips the enabled switch through toggle-host and rolls back on an error", async () => {
    const root = await mount();
    const seen = answer(root, { "toggle-host": (d) => (d.id === "h1" ? { error: "Nope" } : undefined) });
    expect(await edit(root, "enabled", "h3", true)).toBeUndefined();
    expect(seen[0]!.detail).toMatchObject({ id: "h3", enabled: true });
    expect(data(root).items.find((h: { id: string }) => h.id === "h3").enabled).toBe(true);
    expect(await edit(root, "enabled", "h1", false)).toEqual({ error: "Nope" });
    expect(data(root).items.find((h: { id: string }) => h.id === "h1").enabled).toBe(true);
    expect(data(root).notice).toBe("Nope");
  });

  it("validates the dialog, then saves a new host", async () => {
    const root = await mount();
    const seen = answer(root, { "save-host": () => ({ id: "h9" }) });
    button(root, "Add proxy host").click();
    await tick();
    expect(dialog()).not.toBeNull();
    submit(dialog());
    await tick();
    expect(data(root).form.invalid).toEqual({ hosts: true, upstream: true });
    expect(text(dialog())).toContain("Enter valid domain names");
    expect(seen).toHaveLength(0);
    type(dialog().querySelector<HTMLTextAreaElement>("textarea")!, "new.example.com");
    type(dialog().querySelector<HTMLInputElement>("input:not([type=hidden])")!, "http://10.0.0.9:80");
    await tick();
    submit(dialog());
    await tick(80);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.detail).toMatchObject({ hosts: ["new.example.com"], upstream: "http://10.0.0.9:80", tlsMode: "auto", enabled: true });
    expect(seen[0]!.detail.id).toBeUndefined();
    expect(data(root).form.open).toBe(false);
    expect(ids(root)).toContain("h9");
  });

  it("edits a host and keeps the dialog open on a host error", async () => {
    const root = await mount();
    answer(root, { "save-host": () => ({ error: "Domain taken" }) });
    act(root, "edit", "h2");
    await tick();
    expect(data(root).form).toMatchObject({ open: true, editingId: "h2", upstream: "https://api.internal", tls: "custom" });
    submit(dialog());
    await tick(80);
    expect(data(root).form.open).toBe(true);
    expect(data(root).form.error).toBe("Domain taken");
  });

  it("turns WebSockets off for passthrough", async () => {
    const root = await mount();
    const seen = answer(root, { "save-host": () => undefined });
    act(root, "edit", "h1");
    await tick();
    data(root).form.tls = "passthrough";
    await tick();
    expect(data(root).wsBlocked).toBe(true);
    submit(dialog());
    await tick(80);
    expect(seen[0]!.detail).toMatchObject({ tlsMode: "passthrough", websockets: false });
  });

  it("deletes after confirming", async () => {
    const root = await mount();
    const seen = answer(root, { "delete-host": () => undefined });
    act(root, "delete", "h1");
    await tick();
    expect(data(root).confirm.open).toBe(true);
    expect(data(root).confirm.title).toBe("Delete the proxy host for app.example.com?");
    document.querySelector<HTMLElement>('[data-slot="alert-dialog-action"]')!.click();
    await tick(80);
    expect(seen[0]!.detail).toMatchObject({ id: "h1" });
    expect(ids(root)).toEqual(["h2", "h3", "h4"]);
  });

  it("shows the generic error when the handler rejects", async () => {
    const root = await mount();
    root.addEventListener("delete-host", (e) => (e as CustomEvent<Detail>).detail.wait(Promise.reject(new Error("x"))));
    act(root, "delete", "h2");
    await tick();
    document.querySelector<HTMLElement>('[data-slot="alert-dialog-action"]')!.click();
    await tick(80);
    expect(data(root).notice).toBe("Something went wrong. Try again.");
    expect(ids(root)).toHaveLength(4);
  });
});
