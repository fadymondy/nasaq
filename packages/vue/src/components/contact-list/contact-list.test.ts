import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqContactList, type Contact } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const contacts: Contact[] = [
  { id: "1", name: "Sara Ali", email: "sara@example.com", company: "Nasaq", jobTitle: "CTO", stage: "customer", tags: [{ label: "VIP", hue: "violet" }], owner: { name: "Omar Nasser" } },
  { id: "2", name: "Adam Fox", email: "adam@example.com", stage: "lead" },
];
const names = (w: ReturnType<typeof mount>) => w.findAll("tbody tr[data-row]").map((r) => r.findAll("td")[1]!.text());

describe("NqContactList", () => {
  it("sorts by name and shows email, stage and company", () => {
    const w = mount(NqContactList, { props: { contacts }, attachTo: document.body });
    expect(names(w)[0]).toContain("Adam Fox");
    expect(w.text()).toContain("sara@example.com");
    expect(w.text()).toContain("Customer");
    expect(w.text()).toContain("CTO");
  });

  it("searches and calls onRowClick", async () => {
    const clicked: string[] = [];
    const w = mount(NqContactList, { props: { contacts, onRowClick: (c: Contact) => clicked.push(c.id) }, attachTo: document.body });
    await w.find("input[type=search]").setValue("nasaq");
    expect(names(w)).toHaveLength(1);
    await w.find("tbody tr[data-row]").trigger("click");
    expect(clicked).toEqual(["1"]);
  });

  it("renders cards with the stage and the empty state", () => {
    const w = mount(NqContactList, { props: { contacts, defaultView: "cards" }, attachTo: document.body });
    expect(w.findAll("[data-card]")).toHaveLength(2);
    expect(w.text()).toContain("Lead");
    expect(mount(NqContactList, { props: { contacts: [] }, attachTo: document.body }).text()).toContain("No contacts yet");
  });

  it("speaks Arabic and lets labels rename a stage", () => {
    const ar = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqContactList, { contacts })) }, { attachTo: document.body });
    expect(ar.text()).toContain("عميل");
    const w = mount(NqContactList, { props: { contacts, labels: { stages: { lead: "Warm lead" } } }, attachTo: document.body });
    expect(w.text()).toContain("Warm lead");
  });
});
