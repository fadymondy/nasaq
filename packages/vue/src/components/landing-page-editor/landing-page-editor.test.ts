import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqLandingPageEditor, createSection, isSafeHref, isValidSlug, moveSection, publishBlockers, slugify, type LandingPage } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const tick = () => new Promise((r) => setTimeout(r, 0));
const page = (over: Partial<LandingPage> = {}): LandingPage => ({
  title: "Launch",
  slug: "launch",
  seoTitle: "",
  seoDescription: "",
  dir: "ltr",
  status: "draft",
  sections: [createSection("hero"), createSection("faq")],
  ...over,
});

describe("helpers", () => {
  it("validates slugs and links, moves sections and reports blockers", () => {
    expect(slugify(" Hello World_2 ")).toBe("hello-world-2");
    expect(isValidSlug("a-b")).toBe(true);
    expect(isValidSlug("A b")).toBe(false);
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("/signup")).toBe(true);
    expect(moveSection([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(publishBlockers(page({ title: "", slug: "Bad slug" }))).toEqual(["title", "slug"]);
    expect(createSection("hero", "ar").data.primaryLabel).toBe("ابدأ الآن");
  });
});

describe("NqLandingPageEditor", () => {
  it("renders the outline, the preview and the first section form", () => {
    const w = mount(NqLandingPageEditor, { props: { defaultValue: page() }, attachTo: document.body });
    expect(w.find("[data-slot=landing-page-editor]").exists()).toBe(true);
    expect(w.findAll("ol > li")).toHaveLength(2);
    expect(w.find("[role=region]").text()).toContain("A headline that says it in one line");
    expect(w.text()).toContain("Headline");
  });
  it("edits a field, tracks unsaved changes and saves", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqLandingPageEditor, { props: { defaultValue: page(), onSave }, attachTo: document.body });
    const save = () => w.findAll("button").find((b) => b.text() === "Save draft")!;
    expect(save().attributes("disabled")).toBeDefined();
    await w.find("textarea").setValue("New headline");
    expect(w.text()).toContain("Unsaved changes");
    expect(w.find("[role=region]").text()).toContain("New headline");
    await save().trigger("click");
    await tick();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: "Launch" }));
    expect(w.text()).toContain("Draft saved.");
  });
  it("blocks publish on an invalid link and lists why", async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined);
    const bad = page();
    if (bad.sections[0]!.type === "hero") bad.sections[0]!.data.primaryHref = "javascript:x";
    const w = mount(NqLandingPageEditor, { props: { defaultValue: bad, onPublish }, attachTo: document.body });
    expect(w.text()).toContain("Fix the invalid button links.");
    expect(w.findAll("button").find((b) => b.text() === "Publish")!.attributes("disabled")).toBeDefined();
  });
  it("publishes a valid page and shows it as published", async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqLandingPageEditor, { props: { defaultValue: page(), onPublish }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text() === "Publish")!.trigger("click");
    await tick();
    expect(onPublish).toHaveBeenCalledWith(expect.objectContaining({ status: "published" }));
    expect(w.text()).toContain("Page published.");
    expect(w.text()).toContain("Published");
  });
  it("selects a section from the outline and shows an error from a failed save", async () => {
    const onSave = vi.fn().mockResolvedValue({ error: "Nope" });
    const w = mount(NqLandingPageEditor, { props: { defaultValue: page(), onSave }, attachTo: document.body });
    await w.findAll("ol > li button")[2]!.trigger("click");
    expect(w.text()).toContain("Frequently asked questions");
    await w.find("input").setValue("Questions");
    await w.findAll("button").find((b) => b.text() === "Save draft")!.trigger("click");
    await tick();
    expect(w.text()).toContain("Nope");
  });
  it("starts empty with the add menu", () => {
    const w = mount(NqLandingPageEditor, { attachTo: document.body });
    expect(w.text()).toContain("Sections");
  });
});
