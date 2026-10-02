import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appendSection, isPersonaDirty, NqAgentPersonaEditor, personaProblems, type AgentPersona } from ".";
import { countWords } from "./persona-math";

afterEach(() => {
  document.body.innerHTML = "";
});

const agent: AgentPersona = { name: "Support", tagline: "Billing", color: "--nq-tag-blue", icon: "bot", persona: "## Role\n\nHelp.", traits: ["calm"], greeting: "Hi" };

describe("persona math", () => {
  it("detects changes, problems, sections and words", () => {
    expect(isPersonaDirty(agent, { ...agent })).toBe(false);
    expect(isPersonaDirty(agent, { ...agent, traits: ["calm", "x"] })).toBe(true);
    expect(personaProblems({ ...agent, name: " " }, 10)).toEqual(["nameRequired", "personaTooLong"]);
    expect(appendSection("a", "Tone")).toBe("a\n\n## Tone\n\n");
    expect(appendSection("## Tone\n", "tone")).toBe("## Tone\n");
    expect(countWords(" a  b ")).toBe(2);
  });
});

describe("NqAgentPersonaEditor", () => {
  it("renders the form and the preview card, with Save off until edited", () => {
    const w = mount(NqAgentPersonaEditor, { props: { value: agent, onSave: vi.fn() }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("agent-persona-editor");
    expect(w.find('[data-slot="agent-persona-preview"]').text()).toContain("Support");
    expect(w.find('button[type="submit"]').attributes("disabled")).toBeDefined();
  });
  it("saves the draft, and shows an error from the host", async () => {
    const onSave = vi.fn().mockResolvedValueOnce({ error: "Nope" }).mockResolvedValueOnce(undefined);
    const w = mount(NqAgentPersonaEditor, { props: { value: agent, onSave }, attachTo: document.body });
    await w.find('input[placeholder="Support agent"]').setValue("Billing bot");
    expect(w.find('span.text-body-sm[role="status"]').text()).toBe("Unsaved changes");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "Billing bot" }));
    expect(w.find('span.text-body-sm[role="status"]').text()).toBe("Nope");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.find('span.text-body-sm[role="status"]').text()).toBe("Saved.");
  });
  it("requires a name and reverts", async () => {
    const onSave = vi.fn();
    const w = mount(NqAgentPersonaEditor, { props: { value: agent, onSave }, attachTo: document.body });
    await w.find('input[placeholder="Support agent"]').setValue("");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSave).not.toHaveBeenCalled();
    expect(w.text()).toContain("Give the agent a name.");
    await w.findAll("button").find((b) => b.text() === "Revert")!.trigger("click");
    expect((w.find('input[placeholder="Support agent"]').element as HTMLInputElement).value).toBe("Support");
  });
  it("adds a section chip and hides the preview", async () => {
    const w = mount(NqAgentPersonaEditor, { props: { value: agent, onSave: vi.fn(), hidePreview: true }, attachTo: document.body });
    expect(w.find('[data-slot="agent-persona-preview"]').exists()).toBe(false);
    await w.findAll("button").find((b) => b.text() === "Tone")!.trigger("click");
    expect((w.find("textarea").element as HTMLTextAreaElement).value).toContain("## Tone");
  });
});
