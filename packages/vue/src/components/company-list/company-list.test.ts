import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqCompanyList, type Company } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const companies: Company[] = [
  { id: "1", name: "Zed", domain: "zed.io", industry: "Retail", contactsCount: 3, owner: { name: "Omar Nasser" }, tags: [{ label: "vip" }] },
  { id: "2", name: "Acme", domain: "acme.com", industry: "Manufacturing", location: "Riyadh", contactsCount: 12, owner: { name: "Sara Ali" } },
];
const names = (w: ReturnType<typeof mount>) => w.findAll("tbody tr[data-row]").map((r) => r.findAll("td")[1]!.text());

describe("NqCompanyList", () => {
  it("sorts by name and shows domain, industry and contact count", () => {
    const w = mount(NqCompanyList, { props: { companies }, attachTo: document.body });
    expect(names(w)[0]).toContain("Acme");
    expect(w.text()).toContain("acme.com");
    expect(w.text()).toContain("Manufacturing");
    expect(w.text()).toContain("12");
  });

  it("searches by domain and shows the empty state", async () => {
    const w = mount(NqCompanyList, { props: { companies }, attachTo: document.body });
    await w.find("input[type=search]").setValue("zed.io");
    expect(names(w)).toHaveLength(1);
    expect(mount(NqCompanyList, { props: { companies: [] }, attachTo: document.body }).text()).toContain("No companies yet");
  });

  it("renders cards", () => {
    const w = mount(NqCompanyList, { props: { companies, defaultView: "cards" }, attachTo: document.body });
    expect(w.findAll("[data-card]")).toHaveLength(2);
    expect(w.text()).toContain("Owner");
  });

  it("speaks Arabic", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqCompanyList, { companies })) }, { attachTo: document.body });
    expect(w.text()).toContain("الشركة");
  });
});
