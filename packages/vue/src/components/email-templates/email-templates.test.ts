import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqEmailTemplatePreview, NqEmailTemplates, blankEmailTemplate, fillVariables, renderEmailDocument, unknownVariables, type EmailTemplate } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const variables = [{ key: "first_name", label: "First name", sample: "Sara" }];
const templates: EmailTemplate[] = [
  { id: "a", name: "Welcome", category: "welcome", status: "active", subject: "Hi {{first_name}}", body: "<p>Hello {{first_name}} {{oops}}</p>" },
  { id: "b", name: "Receipt", category: "transactional", status: "draft", subject: "Receipt", body: "<p>Paid</p>" },
];
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("helpers", () => {
  it("fills known variables, escapes values and keeps unknown ones", () => {
    expect(fillVariables("Hi {{first_name}} {{x}}", variables)).toBe("Hi Sara {{x}}");
    expect(fillVariables("{{a}}", [{ key: "a", label: "A", sample: "<b>" }], { html: true })).toBe("&lt;b&gt;");
    expect(unknownVariables("{{first_name}} {{x}}", variables)).toEqual(["x"]);
    expect(renderEmailDocument({ body: "<p>x</p>", dir: "rtl" })).toContain('dir="rtl"');
    expect(blankEmailTemplate("n", "rtl")).toMatchObject({ id: "n", dir: "rtl", status: "draft" });
  });
});

describe("NqEmailTemplates", () => {
  it("renders a card per template with a sandboxed thumbnail", () => {
    const w = mount(NqEmailTemplates, { props: { templates, variables }, attachTo: document.body });
    expect(w.find("[data-slot=email-template-gallery]").exists()).toBe(true);
    expect(w.findAll("li iframe")).toHaveLength(2);
    expect(w.find("iframe").attributes("sandbox")).toBe("");
    expect(w.text()).toContain("Hi Sara");
  });
  it("filters by search", async () => {
    const w = mount(NqEmailTemplates, { props: { templates, variables }, attachTo: document.body });
    await w.find("input[type=search]").setValue("receipt");
    expect(w.findAll("li")).toHaveLength(1);
    await w.find("input[type=search]").setValue("zzz");
    expect(w.text()).toContain("No templates match");
  });
  it("opens the editor, warns about unknown variables and saves", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqEmailTemplates, { props: { templates, variables, onSave }, attachTo: document.body });
    await w.find("li button").trigger("click");
    expect(w.find("[data-slot=email-template-editor]").exists()).toBe(true);
    expect(w.text()).toContain("Unknown variables: oops");
    const save = w.findAll("button").find((b) => b.text() === "Save template")!;
    expect(save.attributes("disabled")).toBeDefined();
    await w.find("input").setValue("Welcome 2");
    expect(w.text()).toContain("Unsaved changes");
    await w.findAll("button").find((b) => b.text() === "Save template")!.trigger("click");
    await tick();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: "a", name: "Welcome 2" }));
    expect(w.text()).toContain("Template saved.");
  });
  it("asks before deleting", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqEmailTemplates, { props: { templates, onDelete }, attachTo: document.body });
    await w.find('button[aria-label="Delete: Welcome"]').trigger("click");
    await tick();
    expect(document.body.textContent).toContain("Delete Welcome?");
    const confirm = [...document.body.querySelectorAll("button")].find((b) => b.textContent!.trim() === "Delete")!;
    confirm.click();
    await tick();
    expect(onDelete).toHaveBeenCalledWith(templates[0]);
  });
  it("shows the empty state", () => {
    const w = mount(NqEmailTemplates, { props: { templates: [] } });
    expect(w.text()).toContain("No templates yet");
  });
});

describe("NqEmailTemplatePreview", () => {
  it("shows sender, recipient and switches device", async () => {
    const w = mount(NqEmailTemplatePreview, { props: { template: templates[0]!, variables, sender: { name: "Team", email: "t@x.io" }, recipient: "sara@x.io" } });
    expect(w.text()).toContain("Hi Sara");
    expect(w.text()).toContain("<t@x.io>");
    expect(w.find("[data-device]").attributes("data-device")).toBe("desktop");
  });
});
