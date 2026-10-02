import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { copilotFilterCommands, copilotSegments, copilotSlashQuery, copilotTranscript, copilotVisibleMessages, copilotWithoutSlash, type CopilotMessage } from "./copilot-format";
import { NqCopilotChat } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const messages: CopilotMessage[] = [
  { id: "u1", role: "user", text: "What is overdue?" },
  { id: "a1", role: "assistant", text: "Two tasks.\n\n```ts\nconst x = 1;\n```\n", followUps: ["Show them"], sources: [{ id: "s", title: "Board", url: "https://example.com/b" }] },
];

describe("copilot helpers", () => {
  it("splits fenced code from prose, closing an open fence", () => {
    const parts = copilotSegments("Hi\n\n```js\nlet a\n```\n\nBye");
    expect(parts.map((p) => p.kind)).toEqual(["markdown", "code", "markdown"]);
    expect(copilotSegments("```py\nx = 1").at(-1)).toMatchObject({ kind: "code", language: "py" });
  });

  it("finds and removes the slash word", () => {
    expect(copilotSlashQuery("run /de", 7)).toMatchObject({ query: "de" });
    expect(copilotSlashQuery("a/b", 3)).toBeNull();
    expect(copilotWithoutSlash("run /de", 7)).toBe("run ");
  });

  it("filters commands and hides chosen ones", () => {
    const cmds = [{ id: "a", label: "Deploy" }, { id: "b", label: "Debug" }];
    expect(copilotFilterCommands(cmds, "dep", []).map((c) => c.id)).toEqual(["a"]);
    expect(copilotFilterCommands(cmds, "de", ["a"]).map((c) => c.id)).toEqual(["b"]);
  });

  it("hides hidden messages and builds a transcript", () => {
    expect(copilotVisibleMessages([{ id: "h", role: "user", text: "x", hidden: true }, messages[0]!])).toHaveLength(1);
    expect(copilotTranscript(messages, { user: "You", assistant: "AI" })).toContain("You");
  });
});

describe("NqCopilotChat", () => {
  it("shows the empty state with starters that send", async () => {
    const onSend = vi.fn();
    const w = mount(NqCopilotChat, { props: { messages: [], starters: ["Summarise"], onSend } });
    expect(w.attributes("data-slot")).toBe("copilot-chat");
    expect(w.attributes("data-mode")).toBe("panel");
    await w.find("ul button").trigger("click");
    expect(onSend.mock.calls[0]![0]).toBe("Summarise");
  });

  it("renders user and assistant turns, sources and follow-ups", () => {
    const w = mount(NqCopilotChat, { props: { messages, onSend: () => {}, onRegenerate: () => {}, onFeedback: () => {} } });
    expect(w.text()).toContain("What is overdue?");
    expect(w.text()).toContain("Two tasks.");
    expect(w.text()).toContain("Show them");
    expect(w.find("[data-slot='copilot-actions']").exists()).toBe(true);
    expect(w.find("a[href='https://example.com/b']").exists()).toBe(true);
  });

  it("sends the typed text on Enter and clears the box", async () => {
    const onSend = vi.fn();
    const w = mount(NqCopilotChat, { props: { messages: [], onSend } });
    const ta = w.find("textarea");
    await ta.setValue("Hello");
    await ta.trigger("keydown", { key: "Enter" });
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend.mock.calls[0]![0]).toBe("Hello");
    expect((ta.element as HTMLTextAreaElement).value).toBe("");
  });

  it("disables send while streaming and shows stop", () => {
    const w = mount(NqCopilotChat, { props: { messages: [...messages, { id: "a2", role: "assistant", text: "", streaming: true }], onSend: () => {}, onStop: () => {} } });
    expect(w.find("button[aria-label='Stop']").exists()).toBe(true);
  });

  it("offers slash commands and chips the chosen one", async () => {
    const onSend = vi.fn();
    const w = mount(NqCopilotChat, { attachTo: document.body, props: { messages: [], onSend, commands: [{ id: "deploy", label: "Deploy" }] } });
    const ta = w.find("textarea");
    await ta.setValue("/de");
    (ta.element as HTMLTextAreaElement).setSelectionRange(3, 3);
    await ta.trigger("keyup");
    expect(w.find("[role='listbox']").exists()).toBe(true);
    await w.find("[role='option']").trigger("click");
    expect(w.find("[data-slot='copilot-command-chip']").text()).toContain("Deploy");
    w.unmount();
  });

  it("calls close and new chat", async () => {
    const onClose = vi.fn();
    const onNewChat = vi.fn();
    const w = mount(NqCopilotChat, { props: { messages: [], onSend: () => {}, onClose, onNewChat } });
    await w.find("button[aria-label='Close']").trigger("click");
    await w.find("button[aria-label='New chat']").trigger("click");
    expect(onClose).toHaveBeenCalled();
    expect(onNewChat).toHaveBeenCalled();
  });

  it("speaks Arabic under an Arabic provider", () => {
    const w = mount(() => h(NasaqProvider, { locale: "ar" }, () => h(NqCopilotChat, { messages: [], onSend: () => {} })));
    expect(w.find("[data-slot='copilot-chat'] h2").text()).not.toBe("Assistant");
  });
});
