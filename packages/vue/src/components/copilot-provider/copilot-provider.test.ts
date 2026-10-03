import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqCopilotLauncher, NqCopilotProvider, describeInteraction, finishAnswer, reduceStream, retryPoint, splitStreamingText, startAnswer, useCopilot, useOptionalCopilot, type CopilotContextValue, type CopilotTransport } from ".";

afterEach(() => {
  document.documentElement.lang = "";
  document.documentElement.removeAttribute("dir");
});

const answer: CopilotTransport = async function* () {
  yield { type: "delta", text: "Hello " };
  yield { type: "delta", text: "there" };
  yield { type: "done" };
};

function setup(transport: CopilotTransport = answer, props: Record<string, unknown> = {}) {
  let copilot!: CopilotContextValue;
  const Probe = defineComponent({
    setup() {
      copilot = useCopilot();
      return () => h("div", { "data-probe": "" }, copilot.messages.map((m) => m.text).join("|"));
    },
  });
  const w = mount(NqCopilotProvider, { props: { transport, ...props }, slots: { default: () => h(Probe) }, attachTo: document.body });
  return { w, get copilot() { return copilot; } };
}

describe("stream reducer", () => {
  it("appends deltas, hides a half written artifact block and finishes", () => {
    let s = startAnswer("a");
    s = reduceStream(s, { type: "delta", text: "Hi\n```artifact\n{\"kind\"" });
    expect(s.message.text).toBe("Hi");
    expect(s.message.streaming).toBe(true);
    s = reduceStream(s, { type: "step", step: { id: "t", label: "Search", status: "running" } });
    s = reduceStream(s, { type: "step", step: { id: "t", label: "Search", status: "done" } });
    expect(s.message.steps).toHaveLength(1);
    s = finishAnswer(reduceStream(s, { type: "done" }));
    expect(s.message.streaming).toBe(false);
    expect(splitStreamingText("abc").text).toBe("abc");
  });

  it("finds the retry point and describes interactions", () => {
    const messages = [
      { id: "1", role: "user" as const, text: "q" },
      { id: "2", role: "assistant" as const, text: "a" },
    ];
    expect(retryPoint(messages, "2")?.user.id).toBe("1");
    expect(describeInteraction("pick", ["a", "b"])).toBe("[picked] a, b");
    expect(describeInteraction("action", "go")).toBe("[action] go");
  });
});

describe("NqCopilotProvider", () => {
  it("renders no element of its own", () => {
    const { w } = setup();
    expect(w.find("[data-probe]").exists()).toBe(true);
    expect(w.find("[data-slot=copilot-dock]").exists()).toBe(false);
  });

  it("streams an answer and appends the question", async () => {
    const s = setup(answer, { greeting: "Hi!" });
    expect(s.copilot.messages).toHaveLength(1);
    await s.copilot.send("Hey");
    await flushPromises();
    expect(s.copilot.messages.map((m) => m.text)).toEqual(["Hi!", "Hey", "Hello there"]);
    expect(s.copilot.streaming).toBe(false);
  });

  it("passes history, the message and the session to the transport and records a session event", async () => {
    const transport = vi.fn<CopilotTransport>(async function* () {
      yield { type: "session", id: "s1", title: "Chat" };
      yield { type: "done" };
    });
    const s = setup(transport);
    await s.copilot.send("one");
    await flushPromises();
    expect(transport.mock.calls[0]![0]).toMatchObject({ history: [], message: { text: "one" } });
    expect(s.copilot.sessionId).toBe("s1");
    expect(s.copilot.sessions[0]?.title).toBe("Chat");
    await s.copilot.send("two");
    expect(transport.mock.calls[1]![0].sessionId).toBe("s1");
  });

  it("stops on demand without an error and keeps what arrived", async () => {
    const slow: CopilotTransport = async function* (_r, { signal }) {
      yield { type: "delta", text: "part" };
      await new Promise((r) => setTimeout(r, 20));
      if (signal.aborted) return;
      yield { type: "delta", text: "ial" };
    };
    const s = setup(slow);
    const p = s.copilot.send("go");
    await flushPromises();
    s.copilot.stop();
    await p;
    const last = s.copilot.messages.at(-1)!;
    expect(last.text).toBe("part");
    expect(last.error).toBeUndefined();
    expect(last.streaming).toBe(false);
  });

  it("ends with an error and retries the same question", async () => {
    let calls = 0;
    const flaky: CopilotTransport = async function* () {
      calls++;
      if (calls === 1) throw new Error("boom");
      yield { type: "delta", text: "ok" };
      yield { type: "done" };
    };
    const s = setup(flaky);
    await s.copilot.send("q");
    await flushPromises();
    expect(s.copilot.messages.at(-1)?.error).toBe("boom");
    await s.copilot.retry();
    expect(s.copilot.messages.map((m) => m.text)).toEqual(["q", "ok"]);
  });

  it("opens with a draft, context and auto send", async () => {
    const onOpen = vi.fn();
    const s = setup(answer, { "onUpdate:open": onOpen });
    s.copilot.open({ message: "Draft me", context: [{ id: "o1", label: "Order 1" }] });
    await flushPromises();
    expect(s.copilot.isOpen).toBe(true);
    expect(s.copilot.draft).toBe("Draft me");
    expect(s.copilot.context).toHaveLength(1);
    expect(onOpen).toHaveBeenCalledWith(true);
    s.copilot.open({ message: "Now", autoSend: true, context: [{ id: "o1", label: "dup" }] });
    await flushPromises();
    expect(s.copilot.context).toHaveLength(1);
    expect(s.copilot.messages.at(-1)?.text).toBe("Hello there");
  });

  it("toggles feedback and tells the host", async () => {
    const onFeedback = vi.fn();
    const s = setup(answer, { onFeedback });
    await s.copilot.send("q");
    await flushPromises();
    const id = s.copilot.messages.at(-1)!.id;
    s.copilot.feedback(id, "up");
    expect(s.copilot.messages.at(-1)?.feedback).toBe("up");
    expect(onFeedback).toHaveBeenCalledOnce();
    s.copilot.feedback(id, "up");
    expect(s.copilot.messages.at(-1)?.feedback).toBeNull();
    expect(onFeedback).toHaveBeenCalledOnce();
  });

  it("loads the session list when first opened and deletes a session", async () => {
    const store = {
      list: vi.fn(async () => [{ id: "a", title: "A", at: 1 }]),
      load: vi.fn(async () => [{ id: "m", role: "user" as const, text: "old" }]),
      remove: vi.fn(async () => {}),
    };
    const s = setup(answer, { sessions: store });
    expect(store.list).not.toHaveBeenCalled();
    s.copilot.open();
    await flushPromises();
    expect(store.list).toHaveBeenCalledOnce();
    expect(s.copilot.sessions).toHaveLength(1);
    await s.copilot.loadSession("a");
    expect(s.copilot.messages[0]?.text).toBe("old");
    expect(s.copilot.sessionId).toBe("a");
    await s.copilot.deleteSession("a");
    expect(s.copilot.sessions).toHaveLength(0);
    expect(s.copilot.sessionId).toBeUndefined();
  });

  it("sends artifact choices back as a hidden message", async () => {
    const transport = vi.fn<CopilotTransport>(answer);
    const s = setup(transport);
    await s.copilot.chatProps.onArtifactPick(["x"], { id: "p1", kind: "picker", options: [] } as never);
    await flushPromises();
    const req = transport.mock.calls[0]![0];
    expect(req.message.hidden).toBe(true);
    expect(req.message.text).toBe("[picked] x");
    expect(req.data).toEqual({ type: "artifact-pick", values: ["x"], artifactId: "p1" });
  });

  it("mounts a wired dock with the dock prop", async () => {
    const w = mount(NqCopilotProvider, { props: { transport: answer, dock: { launcher: true } }, attachTo: document.body });
    expect(w.find("[data-slot=copilot-dock]").attributes("hidden")).toBeDefined();
    await w.find("[data-slot=copilot-dock-launcher]").trigger("click");
    expect(w.find("[data-slot=copilot-dock]").attributes("hidden")).toBeUndefined();
    expect(w.find("[data-slot=copilot-chat]").exists()).toBe(true);
  });

  it("useOptionalCopilot is null outside a provider and useCopilot throws", () => {
    let optional: unknown = "x";
    const Out = defineComponent({
      setup() {
        optional = useOptionalCopilot();
        return () => h("i");
      },
    });
    mount(Out);
    expect(optional).toBeNull();
    const Bad = defineComponent({
      setup() {
        useCopilot();
        return () => h("i");
      },
    });
    const err = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => mount(Bad)).toThrow(/NqCopilotProvider/);
    err.mockRestore();
  });
});

describe("NqCopilotLauncher", () => {
  const withProvider = (props: Record<string, unknown> = {}, locale?: string) => {
    const child = () => h(NqCopilotLauncher, props);
    return mount(NqCopilotProvider, {
      props: { transport: answer },
      slots: { default: () => (locale ? h(NasaqProvider, { locale, target: "scope" }, { default: child }) : child()) },
      attachTo: document.body,
    });
  };

  it("toggles the assistant and reports aria-expanded", async () => {
    const w = withProvider();
    const b = () => w.find("[data-slot=copilot-launcher]");
    expect(b().attributes("aria-expanded")).toBe("false");
    expect(b().attributes("title")).toMatch(/Open assistant \((Ctrl\+|⌘)J\)/);
    expect(b().text()).toContain("Ask AI");
    await b().trigger("click");
    expect(b().attributes("aria-expanded")).toBe("true");
    expect(b().attributes("title")).toMatch(/^Close assistant/);
    await b().trigger("click");
    expect(b().attributes("aria-expanded")).toBe("false");
  });

  it("is an icon button with an aria-label in icon look and merges classes", () => {
    const w = withProvider({ look: "icon", class: "custom-x", shortcut: false });
    const b = w.find("[data-slot=copilot-launcher]");
    expect(b.attributes("aria-label")).toBe("Open assistant");
    expect(b.attributes("title")).toBe("Open assistant");
    expect(b.classes()).toContain("custom-x");
    expect(b.text()).toBe("");
  });

  it("speaks Arabic", () => {
    const w = withProvider({}, "ar");
    expect(w.find("[data-slot=copilot-launcher]").text()).toContain("اسأل الذكاء الاصطناعي");
  });
});
