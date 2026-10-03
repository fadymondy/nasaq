import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqChatComposer, NqChatMessage, NqChatThread, NqTypingIndicator } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

describe("NqTypingIndicator", () => {
  it("is a status with three dots and a screen reader label", () => {
    const w = mount(NqTypingIndicator);
    expect(w.attributes("data-slot")).toBe("typing-indicator");
    expect(w.attributes("role")).toBe("status");
    expect(w.findAll("[aria-hidden='true']")).toHaveLength(3);
    expect(w.find(".sr-only").text()).toBe("Assistant is typing");
  });

  it("speaks Arabic under an Arabic provider", () => {
    const w = mount(() => h(NasaqProvider, { locale: "ar" }, () => h(NqTypingIndicator)));
    expect(w.find(".sr-only").text()).toBe("المساعد يكتب");
  });
});

describe("NqChatThread", () => {
  it("is a polite log with the content column and merges classes", () => {
    const w = mount(NqChatThread, { props: { class: "h-40", contentClassName: "gap-8" }, slots: { default: "<p>hi</p>" } });
    expect(w.attributes("data-slot")).toBe("chat-thread");
    expect(w.classes()).toEqual(expect.arrayContaining(["relative", "flex", "h-40"]));
    const log = w.find("[role='log']");
    expect(log.attributes("aria-live")).toBe("polite");
    expect(log.attributes("aria-label")).toBe("Conversation");
    expect(log.attributes("tabindex")).toBe("0");
    expect(log.find("div").classes()).toContain("gap-8");
    expect(w.find("[data-slot='chat-jump']").exists()).toBe(false);
  });

  it("shows the jump button once the reader scrolled up", async () => {
    const w = mount(NqChatThread, { slots: { default: "<p>hi</p>" } });
    const log = w.find("[role='log']");
    Object.defineProperty(log.element, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(log.element, "clientHeight", { value: 200, configurable: true });
    log.element.scrollTop = 100;
    await log.trigger("scroll");
    const jump = w.find("[data-slot='chat-jump']");
    expect(jump.exists()).toBe(true);
    expect(jump.attributes("aria-label")).toBe("Jump to latest");
    log.element.scrollTop = 800;
    await log.trigger("scroll");
    expect(w.find("[data-slot='chat-jump']").exists()).toBe(false);
  });
});

describe("NqChatMessage", () => {
  it("renders an assistant message with avatar, byline and bubble", () => {
    const w = mount(NqChatMessage, { props: { name: "Assistant", time: new Date("2026-09-29T09:00:00Z") }, slots: { default: "Hello there" } });
    expect(w.attributes("data-slot")).toBe("chat-message");
    expect(w.attributes("data-side")).toBe("assistant");
    expect(w.classes()).toContain("self-start");
    expect(w.find("[data-slot='avatar']").exists()).toBe(true);
    expect(w.find("time").exists()).toBe(true);
    const bubble = w.find("[data-slot='chat-bubble']");
    expect(bubble.classes()).toContain("bg-card");
    expect(bubble.find("p").classes()).toContain("whitespace-pre-wrap");
    expect(bubble.text()).toBe("Hello there");
    expect(w.find("[data-slot='chat-status']").exists()).toBe(false);
  });

  it("puts a user message on the inline end", () => {
    const w = mount(NqChatMessage, { props: { side: "user", text: "Hi", class: "extra" } });
    expect(w.attributes("data-side")).toBe("user");
    expect(w.classes()).toEqual(expect.arrayContaining(["flex-row-reverse", "self-end", "extra"]));
    expect(w.find("[data-slot='chat-bubble']").classes()).toContain("bg-secondary");
  });

  it("renders markdown safely", () => {
    const w = mount(NqChatMessage, { props: { format: "markdown", text: "**bold** <script>x</script>" } });
    expect(w.find("[data-slot='markdown']").exists()).toBe(true);
    expect(w.find("strong").text()).toBe("bold");
    expect(w.find("script").exists()).toBe(false);
  });

  it("renders elements in the slot as is", () => {
    const w = mount(NqChatMessage, { slots: { default: () => h("div", { id: "custom" }, "node") } });
    expect(w.find("#custom").exists()).toBe(true);
    expect(w.find("p").exists()).toBe(false);
  });

  it("shows the typing indicator while streaming", () => {
    const w = mount(NqChatMessage, { props: { streaming: true }, slots: { default: "Thinking" } });
    expect(w.attributes("data-streaming")).toBe("");
    expect(w.find("[data-slot='chat-bubble']").attributes("aria-busy")).toBe("true");
    expect(w.find("[data-slot='typing-indicator']").classes()).toContain("mt-1");
    const empty = mount(NqChatMessage, { props: { streaming: true } });
    expect(empty.find("[data-slot='typing-indicator']").classes()).not.toContain("mt-1");
  });

  it("shows sending, sent and error states", () => {
    const sending = mount(NqChatMessage, { props: { status: "sending", text: "x" } });
    expect(sending.attributes("data-status")).toBe("sending");
    expect(sending.find("[data-slot='chat-status'] [role='status']").text()).toBe("Sending…");
    expect(sending.find("[data-slot='spinner']").exists()).toBe(true);
    expect(mount(NqChatMessage, { props: { status: "sent", text: "x" } }).find("[data-slot='chat-status']").text()).toBe("Sent");
  });

  it("offers retry on error only when onRetry is set", async () => {
    const onRetry = vi.fn();
    const w = mount(NqChatMessage, { props: { status: "error", onRetry, text: "x" } });
    expect(w.find("[data-slot='chat-bubble']").classes()).toContain("border-nq-danger");
    expect(w.find("[role='alert']").text()).toBe("Failed to send");
    await w.find("[data-slot='chat-status'] button").trigger("click");
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(mount(NqChatMessage, { props: { status: "error", text: "x" } }).find("button").exists()).toBe(false);
  });
});

describe("NqChatComposer", () => {
  const area = (w: ReturnType<typeof mount>) => w.find<HTMLTextAreaElement>("textarea");
  const send = (w: ReturnType<typeof mount>) => w.find<HTMLButtonElement>("button");

  it("renders a labelled field and a disabled send button while empty", () => {
    const w = mount(NqChatComposer);
    expect(w.attributes("data-slot")).toBe("chat-composer");
    expect(area(w).attributes("aria-label")).toBe("Message");
    expect(area(w).attributes("placeholder")).toBe("Write a message…");
    expect(area(w).attributes("dir")).toBe("auto");
    expect(send(w).attributes("aria-label")).toBe("Send");
    expect(send(w).element.disabled).toBe(true);
  });

  it("sends the trimmed text on Enter and clears itself", async () => {
    const w = mount(NqChatComposer);
    await area(w).setValue("  hello  ");
    expect(send(w).element.disabled).toBe(false);
    await area(w).trigger("keydown", { key: "Enter" });
    expect(w.emitted("send")).toEqual([["hello"]]);
    expect(area(w).element.value).toBe("");
  });

  it("does not send on Shift+Enter or during IME composition", async () => {
    const w = mount(NqChatComposer, { props: { defaultValue: "hi" } });
    await area(w).trigger("keydown", { key: "Enter", shiftKey: true });
    await area(w).trigger("keydown", { key: "Enter", isComposing: true });
    await area(w).trigger("keydown", { key: "Enter", keyCode: 229 });
    expect(w.emitted("send")).toBeUndefined();
  });

  it("sends from the button and works controlled", async () => {
    const w = mount(NqChatComposer, { props: { modelValue: "draft", "onUpdate:modelValue": (v: string) => w.setProps({ modelValue: v }) } });
    await send(w).trigger("click");
    expect(w.emitted("send")).toEqual([["draft"]]);
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual([""]);
  });

  it("blocks sending while disabled or streaming and swaps to stop", async () => {
    const onStop = vi.fn();
    const w = mount(NqChatComposer, { props: { defaultValue: "hi", streaming: true, onStop } });
    expect(send(w).attributes("aria-label")).toBe("Stop");
    await send(w).trigger("click");
    expect(onStop).toHaveBeenCalledTimes(1);
    await area(w).trigger("keydown", { key: "Enter" });
    expect(w.emitted("send")).toBeUndefined();
    const noStop = mount(NqChatComposer, { props: { defaultValue: "hi", streaming: true } });
    expect(send(noStop).attributes("aria-label")).toBe("Send");
    expect(send(noStop).element.disabled).toBe(true);
    const off = mount(NqChatComposer, { props: { defaultValue: "hi", disabled: true } });
    expect(off.attributes("data-disabled")).toBe("");
    expect(area(off).element.disabled).toBe(true);
  });

  it("renders the attachments and actions slots", () => {
    const w = mount(NqChatComposer, { slots: { attachments: "<i id='a'/>", actions: "<i id='b'/>" } });
    expect(w.find("[data-slot='chat-attachments'] #a").exists()).toBe(true);
    expect(w.find("#b").exists()).toBe(true);
    expect(mount(NqChatComposer).find("[data-slot='chat-attachments']").exists()).toBe(false);
  });

  it("is Arabic under an Arabic provider", () => {
    const w = mount(() => h(NasaqProvider, { locale: "ar" }, () => h(NqChatComposer)));
    expect(w.find("textarea").attributes("aria-label")).toBe("الرسالة");
    expect(w.find("button").attributes("aria-label")).toBe("إرسال");
  });
});
