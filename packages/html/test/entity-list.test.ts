// The Blade entity-list example under real Alpine.
import Alpine from "alpinejs";
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="entity-list"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (host: HTMLElement): any => Alpine.$data(root(host));
const cards = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>("[data-card]")];
const names = (host: HTMLElement) => cards(host).map((c) => c.querySelector("[x-text='row.name']")!.textContent);

describe("entity-list (Blade example)", () => {
  it("starts in the card layout with every contact and a result count", async () => {
    const host = await mount("entity-list");
    expect(root(host).getAttribute("data-view")).toBe("cards");
    expect(names(host)).toEqual(["Mona Ali", "Omar Hassan", "Layla Samir"]);
    expect(host.querySelector('[role="status"]')!.textContent).toBe("3 results");
    expect(cards(host)[0]!.getAttribute("tabindex")).toBe("0");
    expect(cards(host)[1]!.getAttribute("tabindex")).toBe("-1");
  });

  it("searches, and clears the filters again", async () => {
    const host = await mount("entity-list");
    data(host).query = "glob";
    await tick();
    expect(names(host)).toEqual(["Omar Hassan"]);
    expect(host.querySelector('[role="status"]')!.textContent).toBe("1 result");
    data(host).clearAll();
    await tick();
    expect(names(host)).toHaveLength(3);
  });

  it("matches a facet on any of the chosen values", async () => {
    const host = await mount("entity-list");
    data(host).facet = { "tags|new": true };
    await tick();
    expect(names(host)).toEqual(["Omar Hassan", "Layla Samir"]);
    expect(data(host).facetCount("tags")).toBe(1);
  });

  it("sorts and switches to the table layout", async () => {
    const host = await mount("entity-list");
    data(host).setSort("name", "desc");
    await tick();
    expect(names(host)).toEqual(["Omar Hassan", "Mona Ali", "Layla Samir"]);
    [...host.querySelectorAll<HTMLButtonElement>('[data-slot="toggle"]')][0]!.click();
    await tick();
    expect(root(host).getAttribute("data-view")).toBe("table");
    expect(host.querySelectorAll("[data-row]")).toHaveLength(3);
    expect(host.querySelector('[role="columnheader"][aria-sort="descending"]')).not.toBeNull();
  });

  it("moves with the arrow keys, selects with Space and reports it", async () => {
    const host = await mount("entity-list");
    const ids: string[][] = [];
    root(host).addEventListener("nq-entity-list-selection", (e) => ids.push((e as CustomEvent).detail.ids));
    const list = cards(host);
    list[0]!.focus();
    await tick();
    list[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    await tick();
    expect(document.activeElement).toBe(list[2]);
    list[2]!.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    await tick();
    expect(cards(host)[2]!.getAttribute("data-state")).toBe("selected");
    expect(ids.at(-1)).toEqual(["c"]);
    expect(data(host).selectedCount()).toBe(1);
  });

  it("opens the row menu on context-click and reports the chosen action", async () => {
    const host = await mount("entity-list");
    const actions: string[] = [];
    root(host).addEventListener("nq-entity-list-action", (e) => actions.push(`${(e as CustomEvent).detail.action}:${(e as CustomEvent).detail.row.id}`));
    cards(host)[0]!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 5, clientY: 5 }));
    await tick(80);
    const item = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((i) => i.textContent!.includes("Open"));
    expect(item).toBeTruthy();
    item!.click();
    await tick();
    expect(actions).toEqual(["open:a"]);
  });
});
