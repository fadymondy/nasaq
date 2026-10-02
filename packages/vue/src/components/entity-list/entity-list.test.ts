import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { NqActivityCell, NqAvatarStack, NqCardMeta, NqEntityIdentity, NqEntityList, NqPersonCell, NqTagList } from ".";
import type { DataTableColumn } from "../data-table";
import { controlsWidth } from "./entity-list-logic";

afterEach(() => {
  document.body.innerHTML = "";
});

interface Contact {
  id: string;
  name: string;
  tags: string[];
}
const data: Contact[] = [
  { id: "a", name: "Bravo", tags: ["vip"] },
  { id: "b", name: "Alpha", tags: ["new", "vip"] },
  { id: "c", name: "Charlie", tags: ["new"] },
];
const columns: DataTableColumn<Contact>[] = [{ id: "name", header: "Name", cell: (r) => r.name, sortValue: (r) => r.name, searchValue: (r) => r.name }];
const facets = [
  {
    id: "tags",
    title: "Tags",
    options: [
      { value: "vip", label: "VIP" },
      { value: "new", label: "New" },
    ],
    getValues: (r: Contact) => r.tags,
  },
];

function host(extra: Record<string, unknown> = {}) {
  return defineComponent({
    setup() {
      return () =>
        h(
          NqEntityList as never,
          {
            data,
            columns,
            facets,
            getRowId: (r: Contact) => r.id,
            label: "Contacts",
            rowActions: (r: Contact) => [{ id: "x", label: `Open ${r.name}`, onSelect: () => {} }],
            ...extra,
          },
          { card: ({ row }: { row: Contact }) => h("span", { class: "card-body" }, row.name) },
        );
    },
  });
}
const tableNames = (w: ReturnType<typeof mount>) => w.findAll("tbody tr[data-row]").map((r) => r.findAll("td")[1]!.text());
const cardNames = (w: ReturnType<typeof mount>) => w.findAll("[data-card] .card-body").map((c) => c.text());

describe("NqEntityList", () => {
  it("renders the table by default and offers both layouts", () => {
    const w = mount(host(), { attachTo: document.body });
    expect(w.find("[data-slot=entity-list]").attributes("data-view")).toBe("table");
    expect(tableNames(w)).toEqual(["Bravo", "Alpha", "Charlie"]);
    expect(w.find("[aria-label='Card view']").exists()).toBe(true);
    expect(w.find("[role=status]").text()).toBe("3 results");
  });

  it("switches to cards and keeps the search", async () => {
    const w = mount(host(), { attachTo: document.body });
    await w.find("input[type=search]").setValue("char");
    await w.find("[aria-label='Card view']").trigger("click");
    expect(w.find("[data-slot=entity-list]").attributes("data-view")).toBe("cards");
    expect(cardNames(w)).toEqual(["Charlie"]);
    expect(w.find("[role=status]").text()).toBe("1 result");
  });

  it("filters by a multi-value facet", async () => {
    const w = mount(host({ defaultView: "cards" }), { attachTo: document.body });
    expect(cardNames(w)).toHaveLength(3);
    await w.find("[data-facet=tags]").trigger("click");
    await nextTick();
    const item = [...document.body.querySelectorAll<HTMLElement>("[role=menuitemcheckbox]")].find((i) => i.textContent!.includes("New"))!;
    item.click();
    await nextTick();
    expect(cardNames(w)).toEqual(["Alpha", "Charlie"]);
    expect(w.text()).toContain("Clear filters");
  });

  it("moves between cards with the arrow keys and toggles selection with Space", async () => {
    const w = mount(host({ defaultView: "cards" }), { attachTo: document.body });
    const cards = w.findAll("[data-card]");
    expect(cards[0]!.attributes("tabindex")).toBe("0");
    (cards[0]!.element as HTMLElement).focus();
    await cards[0]!.trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(cards[1]!.element);
    await cards[1]!.trigger("keydown", { key: " " });
    expect(w.findAll("[data-card]")[1]!.attributes("data-state")).toBe("selected");
  });

  it("opens the row actions as a context menu on a card", async () => {
    const w = mount(host({ defaultView: "cards" }), { attachTo: document.body });
    await w.findAll("[data-card]")[0]!.trigger("contextmenu", { clientX: 10, clientY: 10 });
    await nextTick();
    expect(document.body.textContent).toContain("Open Bravo");
  });

  it("shows the empty and error states for cards", () => {
    const empty = mount(host({ data: [], defaultView: "cards" }), { attachTo: document.body });
    expect(empty.text()).toContain("Nothing here yet");
    const error = mount(host({ defaultView: "cards", error: true }), { attachTo: document.body });
    expect(error.text()).toContain("Couldn't load this list");
    const loading = mount(host({ defaultView: "cards", loading: true }), { attachTo: document.body });
    expect(loading.find("[aria-busy=true]").exists()).toBe(true);
  });

  it("reserves room for the card controls", () => {
    expect(controlsWidth(true, true)).toBe("3.25rem");
    expect(controlsWidth(false, false)).toBe("0px");
  });
});

describe("entity parts", () => {
  it("renders identity, tags, people, activity and meta", () => {
    const identity = mount(NqEntityIdentity, { props: { avatarName: "Mona Ali" }, slots: { default: "Mona Ali", subtitle: "mona@example.com" } });
    expect(identity.text()).toContain("mona@example.com");
    const tags = mount(NqTagList, { props: { tags: [{ label: "a" }, { label: "b" }, { label: "c" }, { label: "d" }] } });
    expect(tags.text()).toContain("+1");
    expect(mount(NqTagList, { props: { tags: [] } }).text()).toBe("—");
    expect(mount(NqPersonCell, { props: { person: { name: "Omar" } } }).text()).toContain("Omar");
    expect(mount(NqAvatarStack, { props: { people: [{ name: "A" }, { name: "B" }, { name: "C" }], max: 2 } }).text()).toContain("+1");
    expect(mount(NqActivityCell, { props: { value: null } }).text()).toBe("—");
    expect(mount(NqCardMeta, { props: { label: "Plan" }, slots: { default: "Pro" } }).text()).toBe("PlanPro");
  });
});
