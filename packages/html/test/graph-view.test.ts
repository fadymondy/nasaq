// The Blade graph-view example (packages/php/examples/rendered/graph-view.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { esc, filterNodes, fitText, visible } from "../src/alpine/graph-view";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 30));

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
  document.documentElement.lang = "en";
  (Alpine.store("nq") as { setLocale(l: string): void }).setLocale("en");
});

async function mount(mutate?: (html: string) => string) {
  const host = document.createElement("div");
  host.innerHTML = mutate ? mutate(rendered("graph-view")) : rendered("graph-view");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

type Scope = { mode: string; selectedId: string | null; query: string; picked: string[]; sortKey: string; sortDir: string; hover: string | null; modeValue: string[] };
const root = () => document.querySelector<HTMLElement>('[data-slot="graph-view"]')!;
const state = () => Alpine.$data(root()) as unknown as Scope;
const body = () => root().querySelector<HTMLElement>("[x-ref=body], [data-slot=graph-stage] > div")!;

describe("graph helpers", () => {
  it("escapes, truncates and filters", () => {
    expect(esc('<b onclick="x">&')).toBe("&lt;b onclick=&quot;x&quot;&gt;&amp;");
    expect(fitText("abcdef", 4)).toBe("abc…");
    const nodes = [{ id: "a", label: "Alpha", kind: "k" }, { id: "b", label: "Beta", kind: "j" }];
    expect(filterNodes(nodes, { query: "al", kinds: [] }).map((n) => n.id)).toEqual(["a"]);
    expect(visible(nodes, [{ source: "a", target: "b" }], "", ["k"]).links).toEqual([]);
  });
});

describe("nqGraph", () => {
  it("draws the graph with a node per item", async () => {
    await mount();
    expect(state().mode).toBe("graph");
    expect(body().querySelectorAll("svg g[data-node]")).toHaveLength(2);
    expect(body().querySelector("[data-link-kind=authored]")).toBeTruthy();
    expect(root().textContent).toContain("2 items, 1 links");
  });

  it("switches to the grid and selects a node into the inspector", async () => {
    await mount();
    state().mode = "grid";
    await tick();
    expect(body().querySelectorAll("li button[data-node]")).toHaveLength(2);
    body().querySelector<HTMLElement>('[data-node="sara"]')!.click();
    await tick();
    expect(state().selectedId).toBe("sara");
    const aside = root().querySelector<HTMLElement>("[data-slot=graph-inspector]")!;
    expect(aside.style.display).not.toBe("none");
    expect(aside.textContent).toContain("Links to");
    expect(aside.textContent).toContain("Onboarding spec");
    aside.querySelector<HTMLElement>('[data-act="close"]')!.click();
    await tick();
    expect(state().selectedId).toBeNull();
  });

  it("emits open from the inspector and follows a link", async () => {
    await mount();
    const events: string[] = [];
    root().addEventListener("open", (e) => events.push((e as CustomEvent).detail.node.id));
    state().mode = "grid";
    state().selectedId = "sara";
    await tick();
    root().querySelector<HTMLElement>('[data-act="goto"]')!.click();
    await tick();
    expect(state().selectedId).toBe("spec");
    root().querySelector<HTMLElement>('[data-act="open"]')!.click();
    expect(events).toEqual(["spec"]);
  });

  it("filters and offers to clear when nothing matches", async () => {
    await mount();
    state().mode = "grid";
    state().query = "zzz";
    await tick();
    expect(body().textContent).toContain("Nothing matches");
    body().querySelector<HTMLElement>('[data-act="clear"]')!.click();
    await tick();
    expect(state().query).toBe("");
    expect(body().querySelectorAll("li button[data-node]")).toHaveLength(2);
  });

  it("filters by kind through the toggle group", async () => {
    await mount();
    state().mode = "grid";
    state().picked = ["doc"];
    await tick();
    expect(body().querySelectorAll("li button[data-node]")).toHaveLength(1);
  });

  it("sorts the list with aria-sort", async () => {
    await mount();
    state().mode = "list";
    await tick();
    const names = () => [...body().querySelectorAll("tbody tr")].map((r) => r.getAttribute("data-node"));
    expect(names()).toEqual(["spec", "sara"]);
    expect(body().querySelector('th[aria-sort="ascending"]')).toBeTruthy();
    body().querySelector<HTMLElement>('[data-act="sort"][data-key="label"]')!.click();
    await tick();
    expect(state().sortDir).toBe("desc");
  });

  it("renders the schema with a column per type", async () => {
    await mount();
    state().mode = "schema";
    await tick();
    expect(body().querySelectorAll("[data-column]")).toHaveLength(2);
  });

  it("selecting a node in the graph by keyboard and pinning with arrows", async () => {
    await mount();
    const node = body().querySelector<HTMLElement>('g[data-node="sara"]')!;
    node.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await tick();
    expect(state().selectedId).toBe("sara");
    body().querySelector<HTMLElement>('g[data-node="sara"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await tick();
    expect(body().querySelector('g[data-node="sara"]')!.getAttribute("data-pinned")).toBe("true");
  });

  it("escapes node text and speaks Arabic with Arabic digits", async () => {
    (Alpine.store("nq") as { setLocale(l: string): void }).setLocale("ar");
    await mount((h) => h.replace("Product lead", "&lt;img src=x onerror=alert(1)&gt;").replace(/Product lead/g, "x"));
    state().mode = "grid";
    await tick();
    expect(body().querySelector("img")).toBeNull();
    expect(root().textContent).toContain("٢");
    expect(state().mode).toBe("grid");
    expect(body().outerHTML.slice(0, 150)).toContain(`dir="rtl"`);
  });
});
