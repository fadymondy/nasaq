// The Blade data-table example (packages/php/examples/rendered/data-table.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 40));

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

// The example holds two tables: the plain issues table (0) and the deployments table with pinning, resizing, multi-sort, ranges and expansion (1).
async function mount(which = 0) {
  const host = document.createElement("div");
  host.innerHTML = rendered("data-table");
  [...host.children].forEach((el, i) => i !== which && el.remove());
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const rowEls = (h: HTMLElement) => [...h.querySelectorAll<HTMLElement>("[data-row]")];
const keys = (h: HTMLElement) => rowEls(h).map((r) => r.querySelector("[data-cell-col=key]")!.textContent!.trim());
const sortBtn = (h: HTMLElement, name: string) => [...h.querySelectorAll<HTMLButtonElement>("[role=columnheader] button")].find((b) => b.textContent!.includes(name))!;

describe("data-table (Alpine)", () => {
  it("renders every row with the table slots", async () => {
    const h = await mount();
    expect(h.querySelector('[data-slot="data-table"]')).toBeTruthy();
    expect(keys(h)).toEqual(["MH-728", "MH-731", "MH-702"]);
  });

  it("sorts by a column and sets aria-sort", async () => {
    const h = await mount();
    sortBtn(h, "Key").click();
    await tick();
    expect(keys(h)).toEqual(["MH-702", "MH-728", "MH-731"]);
    expect(sortBtn(h, "Key").closest("[role=columnheader]")!.getAttribute("aria-sort")).toBe("ascending");
    sortBtn(h, "Key").click();
    await tick();
    expect(keys(h)).toEqual(["MH-731", "MH-728", "MH-702"]);
  });

  it("filters by search and shows the filtered empty state", async () => {
    const h = await mount();
    const q = h.querySelector<HTMLInputElement>('[data-slot="data-table-search"] input')!;
    q.value = "coupon";
    q.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(keys(h)).toEqual(["MH-728"]);
    q.value = "zzz";
    q.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(keys(h)).toEqual([]);
    expect(h.textContent).toContain("No matching results");
  });

  it("selects rows, shows the bulk bar and emits the selection", async () => {
    const h = await mount();
    const ids: string[][] = [];
    h.addEventListener("nq-data-table-selection", ((e: CustomEvent) => ids.push(e.detail.ids)) as unknown as EventListener);
    const bar = h.querySelector<HTMLElement>('[data-slot="data-table-bulk-actions"]')!;
    expect(bar.hidden).toBe(true);
    rowEls(h)[0]!.querySelector<HTMLButtonElement>('button[role="checkbox"]')!.click();
    await tick();
    expect(bar.hidden).toBe(false);
    expect(bar.textContent).toContain("1 selected");
    expect(rowEls(h)[0]!.getAttribute("data-state")).toBe("selected");
    expect(ids.at(-1)).toEqual(["MH-728"]);
    h.querySelector<HTMLButtonElement>("[data-slot=table-header] button[role=checkbox]")!.click();
    await tick();
    expect(bar.textContent).toContain("3 selected");
  });

  it("hides a column from the view menu state", async () => {
    const h = await mount();
    const root = h.querySelector<HTMLElement>('[data-slot="data-table"]')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = Alpine.$data(root) as any;
    data.shown.due = false;
    await tick();
    const th = h.querySelector<HTMLElement>('[role=columnheader][data-col="due"]')!;
    expect(th.style.display).toBe("none");
  });

  it("emits the row action event", async () => {
    const h = await mount();
    const seen: { action: string; row: { key: string } }[] = [];
    h.addEventListener("nq-data-table-action", ((e: CustomEvent) => seen.push(e.detail)) as unknown as EventListener);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = Alpine.$data(h.querySelector<HTMLElement>('[data-slot="data-table"]')!) as any;
    data.act("edit", data.pageRows[1]);
    expect(seen[0]!.action).toBe("edit");
    expect(seen[0]!.row.key).toBe("MH-731");
  });

  it("filters by the status facet", async () => {
    const h = await mount();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = Alpine.$data(h.querySelector<HTMLElement>('[data-slot="data-table"]')!) as any;
    data.facet["status|Done"] = true;
    await tick();
    expect(keys(h)).toEqual(["MH-702"]);
  });

  describe("cells, row actions and the row context menu", () => {
    async function mountExample(name: string) {
      const host = document.createElement("div");
      host.innerHTML = rendered(name);
      document.body.append(host);
      Alpine.initTree(host);
      await tick();
      return host;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableData = (h: HTMLElement) => Alpine.$data(h.querySelector<HTMLElement>('[data-slot="data-table"]')!) as any;
    const rowOf = (h: HTMLElement, text: string) => rowEls(h).find((r) => r.textContent!.includes(text))!;
    const idx = (d: { actions: { id: string }[] }, id: string) => d.actions.findIndex((a) => a.id === id);
    const menuItems = () => [...document.querySelectorAll<HTMLElement>('[data-slot="context-menu-item"]')];

    it("draws an avatar cell with the secondary line and the self badge", async () => {
      const h = await mountExample("admin-users");
      const sara = rowOf(h, "Sara Alharbi");
      expect(sara.textContent).toContain("sara@acme.test");
      expect(sara.textContent).toContain("You");
      const badge = (r: HTMLElement) => r.querySelector<HTMLElement>('[data-slot="badge"]')!;
      expect(badge(rowOf(h, "Omar Nasser")).style.display).toBe("none");
      expect(badge(sara).style.display).not.toBe("none");
      expect(sara.querySelector("bdi")).toBeTruthy();
    });

    it("hides, shows and disables row actions per row (visibleWhen, disabledWhen, any)", async () => {
      const h = await mountExample("admin-users");
      const d = tableData(h);
      const row = (name: string) => d.rows.find((r: { name: string }) => r.name === name);
      const sara = row("Sara Alharbi");
      const omar = row("Omar Nasser");
      const lina = row("Lina Haddad");
      const enable = idx(d, "enable");
      const disable = idx(d, "disable");
      const verify = idx(d, "verify");
      const imp = idx(d, "impersonate");
      expect(d.actionOn(lina, enable)).toBe(true);
      expect(d.actionOn(omar, enable)).toBe(false);
      expect(d.actionOn(omar, disable)).toBe(true);
      expect(d.actionOn(lina, disable)).toBe(false);
      expect(d.actionOff(sara, disable)).toBe(true);
      expect(d.actionOff(omar, disable)).toBe(false);
      expect(d.actionOff(sara, verify)).toBe(true);
      expect(d.actionOff(omar, verify)).toBe(false);
      expect(d.actionOff(sara, imp)).toBe(true);
      expect(d.actionOff(lina, imp)).toBe(true);
      expect(d.actionOff(omar, imp)).toBe(false);
      expect(d.hasActions(omar)).toBe(true);
    });

    it("act ignores an action that is hidden or disabled for the row", async () => {
      const h = await mountExample("admin-users");
      const d = tableData(h);
      const seen: string[] = [];
      h.addEventListener("nq-data-table-action", ((e: CustomEvent) => seen.push(e.detail.action)) as unknown as EventListener);
      const find = (n: string) => d.rows.find((r: { name: string }) => r.name === n);
      d.act("enable", find("Omar Nasser"));
      d.act("verify", find("Sara Alharbi"));
      expect(seen).toEqual([]);
      d.act("enable", find("Lina Haddad"));
      expect(seen).toEqual(["enable"]);
    });

    it("evaluates conditions: in, notIn, eq, ne, empty, any, all", async () => {
      const h = await mountExample("admin-users");
      const d = tableData(h);
      const r = { a: "x", b: "", c: ["k"] };
      expect(d.matches(r, { field: "a", in: ["x", "y"] })).toBe(true);
      expect(d.matches(r, { field: "a", notIn: ["x"] })).toBe(false);
      expect(d.matches(r, { field: "a", eq: "x" })).toBe(true);
      expect(d.matches(r, { field: "a", ne: "x" })).toBe(false);
      expect(d.matches(r, { field: "b", empty: true })).toBe(true);
      expect(d.matches(r, { field: "c", empty: true })).toBe(false);
      expect(d.matches(r, { any: [{ field: "a", eq: "no" }, { field: "b", empty: true }] })).toBe(true);
      expect(d.matches(r, { all: [{ field: "a", eq: "x" }, { field: "b", empty: false }] })).toBe(false);
      expect(d.matches(r, undefined)).toBe(true);
    });

    it("honours actionsKey as an allow-list of action ids", async () => {
      const h = await mountExample("admin-users");
      const d = tableData(h);
      d.actionsKey = "allow";
      const verify = idx(d, "verify");
      expect(d.actionOn({ allow: ["verify"] }, verify)).toBe(true);
      expect(d.actionOn({ allow: ["edit"] }, verify)).toBe(false);
      expect(d.actionOn({}, verify)).toBe(true);
    });

    it("opens the row context menu on right-click with only that row's actions", async () => {
      const h = await mountExample("admin-users");
      const lina = rowOf(h, "Lina Haddad");
      const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 40 });
      lina.dispatchEvent(ev);
      await tick();
      expect(ev.defaultPrevented).toBe(true);
      const labels = menuItems().map((e) => e.textContent!.trim());
      expect(labels.some((l) => /enable/i.test(l) && !/disable/i.test(l))).toBe(true);
      expect(labels.some((l) => /^disable/i.test(l))).toBe(false);
    });

    it("keeps the browser menu on Shift + right-click", async () => {
      const h = await mountExample("admin-users");
      const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, shiftKey: true });
      rowOf(h, "Lina Haddad").dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(false);
    });

    it("opens the context menu on Shift+F10 from a focused row", async () => {
      const h = await mountExample("admin-users");
      const row = rowOf(h, "Omar Nasser");
      row.focus();
      const ev = new KeyboardEvent("keydown", { key: "F10", shiftKey: true, bubbles: true, cancelable: true });
      row.dispatchEvent(ev);
      await tick();
      expect(ev.defaultPrevented).toBe(true);
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    it("draws mono, meter, datetime and link cells and the cell slot", async () => {
      const host = document.createElement("div");
      host.innerHTML = rendered("invoice-list");
      document.body.append(host);
      Alpine.initTree(host);
      await tick();
      expect(host.querySelector("bdi[dir=ltr].font-mono")).toBeTruthy();
      const d = tableData(host);
      expect(d.hasActions(d.rows[0])).toBe(true);
    });

    it("formats datetime, meter and template cells", async () => {
      const h = await mountExample("data-table");
      const d = tableData(h);
      d.relative = false;
      const col = { id: "t", type: "datetime", format: "absolute" };
      expect(typeof d.display({ t: "2026-09-28T10:00:00Z" }, col)).toBe("string");
      const m = { id: "m", type: "meter", max: 100, warnAt: 0.7, dangerAt: 0.9 };
      expect(d.meterFraction({ m: 50 }, m)).toBeCloseTo(0.5);
      expect(d.meterTone({ m: 50 }, m)).toBe("default");
      expect(d.meterTone({ m: 75 }, m)).toBe("warning");
      expect(d.meterTone({ m: 95 }, m)).toBe("danger");
      expect(d.href({ h: "javascript:alert(1)" }, { id: "h", type: "link", href: "h" })).toBeFalsy();
    });

    it("keeps name-key naming rows and the view-options menu", async () => {
      const h = await mountExample("admin-users");
      const trigger = h.querySelector('[data-slot="data-table-row-actions"] button, button[aria-label^="Actions for"]');
      expect(h.innerHTML).toContain("Actions for");
      expect(tableData(h).name(tableData(h).rows[0])).toBe("Sara Alharbi");
      expect(trigger).toBeTruthy();
      expect([...h.querySelectorAll("button")].some((b) => b.textContent!.trim() === "View")).toBe(true);
    });
  });

  describe("deployments table: multi-sort, pinning, resizing, ranges, expansion", () => {
    const root = (h: HTMLElement) => h.querySelector<HTMLElement>('[data-slot="data-table"]')!;
    const data = (h: HTMLElement) => Alpine.$data(root(h)) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    const head = (h: HTMLElement, id: string) => h.querySelector<HTMLElement>(`[data-slot="table-head"][data-col="${id}"]`)!;
    const cell = (h: HTMLElement, rowIndex: number, id: string) => rowEls(h)[rowIndex]!.querySelector<HTMLElement>(`[data-cell-col="${id}"]`)!;
    const services = (h: HTMLElement) => rowEls(h).map((r) => r.querySelector("[data-cell-col=service]")!.textContent!.trim());

    it("sorts by several columns with Shift and says the later key priority", async () => {
      const h = await mount(1);
      sortBtn(h, "Owner").click();
      await tick();
      sortBtn(h, "Requests").dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
      await tick();
      expect(data(h).sorting.map((x: { id: string }) => x.id)).toEqual(["owner", "requests"]);
      // Layla's two rows ordered by requests, then Omar, then Sara.
      expect(services(h)).toEqual(["search-index", "checkout-api", "invoice-worker", "notifier"]);
      expect(sortBtn(h, "Owner").title).toBe("Shift-click to sort by more columns");
      expect(head(h, "owner").getAttribute("aria-sort")).toBe("ascending");
      expect(head(h, "requests").getAttribute("aria-sort")).toBeNull();
      expect(sortBtn(h, "Requests").querySelector(".sr-only")!.textContent).toBe("sort 2, ascending");
      expect(sortBtn(h, "Owner").querySelector(".sr-only")!.textContent).toBe("");
      expect(sortBtn(h, "Owner").querySelector('[data-slot="data-table-sort-index"]')!.textContent).toBe("1");
    });

    it("filters by a numeric range and a date range", async () => {
      const h = await mount(1);
      const input = (id: string) => document.querySelector<HTMLInputElement>(`[data-range="${id}"]`)!;
      const set = async (id: string, v: string) => {
        input(id).value = v;
        input(id).dispatchEvent(new Event("input", { bubbles: true }));
        await tick();
      };
      await set("requests-min", "9000");
      expect(services(h)).toEqual(["checkout-api", "invoice-worker", "notifier"]);
      await set("requests-max", "10000");
      expect(services(h)).toEqual(["invoice-worker"]);
      data(h).resetRange("requests");
      await set("deployed-min", "2026-09-29");
      expect(services(h)).toEqual(["checkout-api", "search-index"]);
    });

    it("pins a column to the start, with the select column following and an edge divider", async () => {
      const h = await mount(1);
      expect(head(h, "service").getAttribute("data-pin")).toBe("start");
      expect(head(h, "service").getAttribute("data-edge")).toBe("start");
      expect(head(h, "region").hasAttribute("data-pin")).toBe(false);
      expect(head(h, "__nq-select").getAttribute("data-pin")).toBe("start");
      expect(head(h, "__nq-actions")).toBeNull();
      expect(cell(h, 0, "service").getAttribute("data-pin")).toBe("start");
      expect(cell(h, 0, "service").className).toContain("data-[pin]:sticky");
      // Offsets come from the measured widths: the select (40px) and expand (36px) columns sit first, the service column after them.
      const widths: Record<string, number> = { "__nq-select": 40, "__nq-expand": 36, service: 180 };
      const real = HTMLElement.prototype.getBoundingClientRect;
      HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
        return { width: widths[this.dataset.col ?? ""] ?? 100 } as DOMRect;
      };
      try {
        data(h).measure();
        await tick();
      } finally {
        HTMLElement.prototype.getBoundingClientRect = real;
      }
      expect(head(h, "__nq-select").style.insetInlineStart).toBe("0px");
      expect(head(h, "__nq-expand").style.insetInlineStart).toBe("40px");
      expect(head(h, "service").style.insetInlineStart).toBe("76px");
      expect(cell(h, 1, "service").style.insetInlineStart).toBe("76px");
    });

    it("moves end-pinned columns last, and the View menu radio state drives the same pinning", async () => {
      const h = await mount(1);
      data(h).pinColumn("region", "end");
      await tick();
      expect(head(h, "region").getAttribute("data-pin")).toBe("end");
      expect(head(h, "region").getAttribute("data-edge")).toBe("end");
      expect(Number(head(h, "region").style.order)).toBeGreaterThan(Number(head(h, "status").style.order));
      expect(Number(head(h, "service").style.order)).toBeLessThan(Number(head(h, "owner").style.order));
      data(h).pinSel = { ...data(h).pinSel, region: "none" };
      await tick();
      expect(head(h, "region").hasAttribute("data-pin")).toBe(false);
      expect(data(h).pinning).toEqual({ start: ["service"], end: [] });
    });

    it("offers a Pin submenu per column in the View menu", async () => {
      const h = await mount(1);
      const subs = [...document.querySelectorAll("[data-pin-column]")].map((el) => el.getAttribute("data-pin-column"));
      expect(subs).toEqual(["service", "region", "owner", "requests", "deployed", "status"]);
    });

    it("resizes a column from its handle and resets on double-click", async () => {
      const h = await mount(1);
      const handle = (id: string) => head(h, id).querySelector<HTMLElement>('[data-slot="data-table-resize-handle"]');
      expect(handle("status")).toBeNull();
      const owner = handle("owner")!;
      expect(owner.getAttribute("role")).toBe("separator");
      expect(owner.getAttribute("aria-label")).toBe("Resize Owner");
      expect(owner.getAttribute("aria-valuemin")).toBe("48");
      expect(owner.getAttribute("aria-valuemax")).toBe("960");
      expect(owner.getAttribute("aria-valuenow")).toBe("160");
      expect(owner.tabIndex).toBe(0);
      const cols = () => h.querySelector<HTMLElement>('[data-slot="table"]')!.style.gridTemplateColumns;
      expect(cols()).toContain("160px");
      owner.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      await tick();
      expect(owner.getAttribute("aria-valuenow")).toBe("176");
      owner.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true }));
      await tick();
      expect(owner.getAttribute("aria-valuenow")).toBe("240");
      expect(cols()).toContain("240px");
      // Limits hold.
      data(h).setColumnSize("owner", 5000);
      await tick();
      expect(owner.getAttribute("aria-valuenow")).toBe("960");
      data(h).setColumnSize("owner", 1);
      await tick();
      expect(owner.getAttribute("aria-valuenow")).toBe("48");
      owner.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      await tick();
      expect(owner.hasAttribute("aria-valuenow")).toBe(false);
      expect(cols()).not.toContain("48px");
    });

    it("expands rows to the slot only for the rows that have details", async () => {
      const h = await mount(1);
      const btn = (i: number) => rowEls(h)[i]!.querySelector<HTMLButtonElement>('[data-slot="data-table-expand"]')!;
      expect(btn(0).style.display).not.toBe("none");
      expect(btn(2).style.display).toBe("none");
      expect(rowEls(h)[2]!.getAttribute("aria-expanded")).toBeNull();
      btn(0).click();
      await tick();
      const open = h.querySelector('[data-slot="data-table-expanded"]')!;
      expect(open.textContent).toContain("Rolled out behind the new flag.");
      expect(open.querySelector("section")!.getAttribute("aria-label")).toBe("Details for checkout-api");
      expect(rowEls(h)[0]!.getAttribute("aria-expanded")).toBe("true");
      btn(0).click();
      await tick();
      expect(h.querySelector('[data-slot="data-table-expanded"]')).toBeNull();
    });
  });
});
