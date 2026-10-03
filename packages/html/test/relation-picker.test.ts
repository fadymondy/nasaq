// The Blade relation-picker example (packages/php/examples/rendered/relation-picker.html) under real Alpine, with fetch mocked.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
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
  vi.unstubAllGlobals();
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

const json = (body: unknown, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) });

async function mount(fetchMock: (url: string, init?: RequestInit) => Promise<unknown> = () => json([])) {
  vi.stubGlobal("fetch", vi.fn(fetchMock));
  const host = document.createElement("div");
  host.innerHTML = rendered("relation-picker");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
}

const pickers = () => [...document.querySelectorAll<HTMLElement>('[data-slot="relation-picker"]')];
const local = () => pickers()[0]!;
const remote = () => pickers()[1]!;
const multi = () => pickers()[2]!;
const input = (root: HTMLElement) => root.querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!;
const hidden = (name: string) => [...document.querySelectorAll<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)];
// Every picker teleports its own popup to <body>; the open one is the one an input points at with aria-controls.
const rows = () => {
  const ids = [...document.querySelectorAll('[data-slot="combobox-input"]')].map((i) => i.getAttribute("aria-controls")).filter(Boolean) as string[];
  return ids.flatMap((id) => [...(document.getElementById(id)?.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]') ?? [])]);
};
const rowText = () => rows().map((r) => r.textContent?.replace(/\s+/g, " ").trim());
const type = async (el: HTMLInputElement, text: string, wait = 120) => {
  el.value = text;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  await tick(wait);
};

describe("relation-picker (Blade example)", () => {
  it("shows the name of the saved id and writes the id to the hidden input", async () => {
    await mount();
    expect(input(local()).value).toBe("Nile Logistics");
    expect(hidden("customer_id")[0]!.value).toBe("c2");
  });

  it("filters the fixed options on the client and picks one", async () => {
    await mount();
    input(local()).focus();
    input(local()).click();
    await tick();
    expect(rowText().length).toBe(3);
    await type(input(local()), "riy");
    // The chosen record stays listed so the box can show it; the match follows.
    expect(rowText()).toHaveLength(2);
    expect(rowText()[1]).toContain("Riyadh Foods");
    rows()[1]!.click();
    await tick();
    expect(hidden("customer_id")[0]!.value).toBe("c3");
    expect(input(local()).value).toBe("Riyadh Foods");
  });

  it("searches the endpoint with the typed text and shows what comes back", async () => {
    const calls: string[] = [];
    await mount(async (url) => {
      calls.push(url);
      return json(url.includes("q=zed") ? [{ value: "z1", label: "Zed Corp" }] : []);
    });
    input(remote()).click();
    await tick();
    await type(input(remote()), "zed", 200);
    expect(calls.some((u) => u.includes("q=zed"))).toBe(true);
    expect(rowText().some((t) => t?.includes("Zed Corp"))).toBe(true);
    rows().find((r) => r.textContent?.includes("Zed Corp"))!.click();
    await tick();
    expect(hidden("remote_id")[0]!.value).toBe("z1");
  });

  it("shows an error with Try again when the search fails", async () => {
    await mount(() => json({}, false));
    input(remote()).click();
    await tick();
    await type(input(remote()), "boom", 200);
    expect(document.body.textContent).toContain("Could not load results.");
    expect(document.body.textContent).toContain("Try again");
  });

  it("creates a record from the typed text", async () => {
    const posts: unknown[] = [];
    await mount(async (url, init) => {
      if (init?.method === "POST") {
        posts.push(JSON.parse(String(init.body)));
        return json({ value: "n1", label: "Brand New" });
      }
      return json([]);
    });
    input(remote()).click();
    await tick();
    await type(input(remote()), "Brand New", 200);
    const create = rows().find((r) => r.textContent?.includes("Create “Brand New”"));
    expect(create).toBeTruthy();
    create!.click();
    await tick(100);
    expect(posts).toEqual([{ name: "Brand New" }]);
    expect(hidden("remote_id")[0]!.value).toBe("n1");
  });

  it("holds an alert when creating fails", async () => {
    await mount(async (url, init) => (init?.method === "POST" ? json({ error: "no" }, false) : json([])));
    input(remote()).click();
    await tick();
    await type(input(remote()), "Nope", 200);
    rows().find((r) => r.textContent?.includes("Create"))!.click();
    await tick(100);
    const alert = remote().querySelector<HTMLElement>('[role="alert"]')!;
    expect(alert.style.display).not.toBe("none");
    expect(alert.textContent).toContain("Could not create it.");
  });

  it("multiple: chips for saved ids, a hidden input per id, remove a chip", async () => {
    await mount();
    const chips = () => [...multi().querySelectorAll<HTMLElement>('[data-slot="combobox-chip"]')].map((c) => c.textContent?.trim());
    expect(chips()).toEqual(["Acme Trading", "أغذية الرياض"].map((t) => expect.stringContaining(t === "أغذية الرياض" ? "Riyadh Foods" : t)));
    expect(hidden("team_ids[]").map((i) => i.value)).toEqual(["c1", "c3"]);
    multi().querySelector<HTMLElement>('[data-slot="combobox-chip-remove"]')!.click();
    await tick();
    expect(hidden("team_ids[]").map((i) => i.value)).toEqual(["c3"]);
  });
});
