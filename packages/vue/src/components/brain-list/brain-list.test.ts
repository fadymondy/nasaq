import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h, nextTick } from "vue";
import { NasaqProvider } from "../../provider";
import { NqBrainCard, NqBrainList, type BrainSummary } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const brains: BrainSummary[] = [
  { id: "a", name: "Handbook", description: "Policies.", avatar: "📘", status: "ready", visibility: "team", memories: 1842, sources: 6, chats: 412, tags: [{ label: "hr" }], lastActive: "2026-09-28T09:00:00Z" },
  { id: "b", name: "Support", status: "indexing", visibility: "private", memories: 20, sources: 1, lastActive: "2026-09-20T09:00:00Z" },
  { id: "c", name: "Sales", status: "error", visibility: "public", memories: 5, sources: 2, tags: [{ label: "crm" }], lastActive: "2026-09-10T09:00:00Z" },
];
const names = (w: ReturnType<typeof mount>) => w.findAll("tbody tr[data-row]").map((r) => r.findAll("td")[1]!.text());

describe("NqBrainList", () => {
  it("renders rows newest activity first with status and access", () => {
    const w = mount(NqBrainList, { props: { brains }, attachTo: document.body });
    expect(w.find("[data-slot=entity-list]").exists()).toBe(true);
    expect(names(w)[0]).toContain("Handbook");
    expect(w.text()).toContain("Ready");
    expect(w.text()).toContain("Needs attention");
    expect(w.text()).toContain("Team");
  });

  it("searches by name", async () => {
    const w = mount(NqBrainList, { props: { brains }, attachTo: document.body });
    await w.find("input[type=search]").setValue("supp");
    expect(names(w)).toHaveLength(1);
    expect(names(w)[0]).toContain("Support");
  });

  it("filters by the status facet in the card view", async () => {
    const w = mount(NqBrainList, { props: { brains, defaultView: "cards" }, attachTo: document.body });
    expect(w.findAll("[data-slot=brain-card]")).toHaveLength(3);
    await w.find("[data-facet=status]").trigger("click");
    await nextTick();
    const item = [...document.body.querySelectorAll<HTMLElement>("[role=menuitemcheckbox]")].find((i) => i.textContent!.includes("Indexing"))!;
    item.click();
    await nextTick();
    expect(w.findAll("[data-slot=brain-card]")).toHaveLength(1);
  });

  it("shows the empty state and lets labels override strings", () => {
    const empty = mount(NqBrainList, { props: { brains: [] }, attachTo: document.body });
    expect(empty.text()).toContain("No brains yet");
    const w = mount(NqBrainList, { props: { brains, labels: { statuses: { ready: "Live" } } }, attachTo: document.body });
    expect(w.text()).toContain("Live");
  });

  it("passes row clicks and row actions through to the entity list", async () => {
    const clicked: string[] = [];
    const w = mount(NqBrainList, {
      props: { brains, onRowClick: (b: BrainSummary) => clicked.push(b.id), rowActions: (b: BrainSummary) => [{ id: "open", label: `Open ${b.name}`, onSelect: () => {} }] },
      attachTo: document.body,
    });
    await w.findAll("tbody tr[data-row]")[0]!.trigger("click");
    expect(clicked).toEqual(["a"]);
    await w.findAll("tbody tr[data-row]")[0]!.trigger("contextmenu", { clientX: 5, clientY: 5 });
    await nextTick();
    expect(document.body.textContent).toContain("Open Handbook");
  });

  it("speaks Arabic", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqBrainList, { brains })) }, { attachTo: document.body });
    expect(w.text()).toContain("جاهز");
  });
});

describe("NqBrainCard", () => {
  it("shows the mark, counts and a footer slot", () => {
    const w = mount(NqBrainCard, { props: { brain: brains[0]! }, slots: { footer: () => h("button", "Open") } });
    expect(w.attributes("data-slot")).toBe("brain-card");
    expect(w.text()).toContain("📘");
    expect(w.text()).toContain("412");
    expect(w.text()).toContain("Open");
  });
});
