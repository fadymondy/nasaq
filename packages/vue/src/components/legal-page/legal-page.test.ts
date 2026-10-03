import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqLegalPage, legalHashTarget, legalSectionUrl, resolveLegalSections, type LegalDocument } from ".";

const doc: LegalDocument = {
  id: "terms",
  title: "Terms of service",
  summary: "The rules.",
  updated: "2026-09-01",
  effective: "2026-10-01",
  version: "2.0",
  draft: true,
  sections: [
    { title: "Using the service", body: "You agree to use it **lawfully**." },
    { title: "Payments", body: "Fees are billed monthly." },
    { title: "Payments", body: "Again." },
  ],
};

describe("legal model", () => {
  it("gives sections unique anchors", () => {
    expect(resolveLegalSections(doc.sections).map((r) => r.id)).toEqual(["using-the-service", "payments", "payments-2"]);
    expect(resolveLegalSections([{ id: "x", title: "T" }])[0]!.id).toBe("x");
  });
  it("reads hashes and builds links", () => {
    expect(legalHashTarget("#payments", ["payments"])).toBe("payments");
    expect(legalHashTarget("", ["payments"])).toBeUndefined();
    expect(legalSectionUrl("https://a.test/terms#old", "payments")).toBe("https://a.test/terms#payments");
  });
});

describe("NqLegalPage", () => {
  it("renders header, numbered sections, draft notice and rail", () => {
    const w = mount(NqLegalPage, { props: { document: doc } });
    expect(w.attributes("data-slot")).toBe("legal-page");
    expect(w.get("h1").text()).toBe("Terms of service");
    expect(w.text()).toContain("Version 2.0");
    expect(w.get('[data-slot="alert"]').attributes("data-tone")).toBe("warning");
    const sections = w.findAll('[data-slot="legal-section"]');
    expect(sections).toHaveLength(3);
    expect(sections[0]!.get("h2").attributes("id")).toBe("using-the-service");
    expect(sections[0]!.get("h2").text()).toContain("1.");
    expect(sections[0]!.get("[aria-label]").attributes("aria-label")).toBe("Copy link to this section: Using the service");
    expect(w.get('[data-slot="table-of-contents"]').findAll("a")).toHaveLength(3);
  });

  it("shows the switcher for two documents and emits the pick", async () => {
    const w = mount(NqLegalPage, { props: { document: doc, documents: [{ id: "terms", title: "Terms" }, { id: "privacy", title: "Privacy" }] } });
    const buttons = w.get("nav").findAll("button");
    expect(buttons[0]!.attributes("aria-current")).toBe("page");
    await buttons[1]!.trigger("click");
    expect(w.emitted("selectDocument")![0]).toEqual(["privacy"]);
    await buttons[0]!.trigger("click");
    expect(w.emitted("selectDocument")).toHaveLength(1);
  });

  it("hides the switcher for one document and renders the footer slot", () => {
    const w = mount(NqLegalPage, { props: { document: { ...doc, draft: false }, documents: [{ id: "terms", title: "Terms" }] }, slots: { footer: "legal@example.com" } });
    expect(w.find("nav[aria-label='Legal documents']").exists()).toBe(false);
    expect(w.find('[data-slot="alert"]').exists()).toBe(false);
    expect(w.text()).toContain("legal@example.com");
  });
});
