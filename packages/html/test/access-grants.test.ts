// The Blade access-grants example (packages/php/examples/rendered/access-grants.html) under real Alpine.
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
  host.innerHTML = rendered("access-grants");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host.querySelector<HTMLElement>('[data-slot="access-grants"]')!;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element): any => Alpine.$data(el as HTMLElement);
const listen = (root: Element, name: string, result?: unknown) => {
  const calls: Record<string, unknown>[] = [];
  root.addEventListener(name, (e) => {
    const d = (e as CustomEvent).detail;
    calls.push(d);
    d.wait(Promise.resolve(result));
  });
  return calls;
};

describe("access-grants (Blade example)", () => {
  it("renders the apps, the scopes and the matrix", async () => {
    const root = await mount();
    const rows = root.querySelectorAll('[data-slot="access-apps"] > li');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toContain("Read documents");
    expect(rows[0]!.textContent).toContain("Read only");
    expect(rows[1]!.textContent).toContain("+2 more");
    const matrix = root.querySelector('[data-slot="access-matrix"]')!;
    expect(matrix.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(matrix.textContent).toContain("Reads 2, writes 1");
  });

  it("filters the apps by workspace", async () => {
    const root = await mount();
    data(root).org = "o2";
    await tick();
    const rows = [...root.querySelectorAll<HTMLElement>('[data-slot="access-apps"] > li')];
    expect(rows.every((r) => r.style.display === "none")).toBe(true);
    data(root).org = "o1";
    await tick();
    expect(rows.every((r) => r.style.display !== "none")).toBe(true);
  });

  it("asks before revoking, then fires revoke and shows a notice", async () => {
    const root = await mount();
    const calls = listen(root, "revoke");
    data(root).askRevoke("a1");
    expect(data(root).revokeOpen).toBe(true);
    expect(data(root).revokeTitle).toBe("Revoke Notion Sync?");
    await data(root).runRevoke();
    expect(calls[0]).toMatchObject({ appId: "a1" });
    expect(data(root).revokeOpen).toBe(false);
    expect(data(root).notice.text).toBe("Notion Sync was revoked.");
  });

  it("shows the host's error, and a generic one when nobody listens", async () => {
    const root = await mount();
    const off = (e: Event) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Pinned" }));
    root.addEventListener("revoke", off);
    data(root).askRevoke("a1");
    await data(root).runRevoke();
    expect(data(root).notice).toMatchObject({ tone: "danger", text: "Pinned" });
    root.removeEventListener("revoke", off);
    data(root).askRevoke("a1");
    await data(root).runRevoke();
    expect(data(root).notice.text).toBe("Access could not be revoked. Try again.");
  });

  it("saves a changed cell at once and updates the summary", async () => {
    const root = await mount();
    const calls = listen(root, "change-grant");
    data(root).cells["g1:billing"] = "write";
    await tick();
    expect(calls[0]).toMatchObject({ agentId: "g1", resourceId: "billing", level: "write" });
    expect(data(root).saved["g1:billing"]).toBe("write");
    expect(root.querySelector('[data-slot="access-matrix"]')!.textContent).toContain("Reads 2, writes 2");
  });

  it("puts a cell back when the host fails", async () => {
    const root = await mount();
    listen(root, "change-grant", { error: "Nope" });
    data(root).cells["g1:docs"] = "none";
    await tick();
    expect(data(root).cells["g1:docs"]).toBe("write");
    expect(data(root).notice).toMatchObject({ tone: "danger", text: "Nope" });
  });

  it("puts a cell back with a generic error when nobody listens", async () => {
    const root = await mount();
    data(root).cells["g1:docs"] = "read";
    await tick();
    expect(data(root).cells["g1:docs"]).toBe("write");
    expect(data(root).notice.text).toBe("That change did not save, so it was put back. Try again.");
  });
});
