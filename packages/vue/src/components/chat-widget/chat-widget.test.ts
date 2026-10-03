import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqChatWidget, type WidgetMessage } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const msgs: WidgetMessage[] = [{ id: "1", from: "agent", text: "Hello there", at: 0, name: "Layla" }];

function widget(props: Record<string, unknown> = {}) {
  return mount(NqChatWidget, { attachTo: document.body, props: { messages: msgs, onSend: vi.fn(async () => {}), ...props } });
}

describe("NqChatWidget", () => {
  it("shows only the launcher while closed, with an unread badge", () => {
    const w = widget({ unread: 3 });
    expect(w.attributes("data-slot")).toBe("chat-widget");
    expect(w.attributes("data-open")).toBeUndefined();
    expect(w.find("[role='dialog']").exists()).toBe(false);
    const launcher = w.find("button");
    expect(launcher.attributes("aria-label")).toBe("Open chat");
    expect(launcher.attributes("aria-expanded")).toBe("false");
    expect(launcher.text()).toContain("3");
    expect(launcher.find(".sr-only").text()).toBe("3 unread");
  });

  it("opens from the launcher, labels the dialog and closes on Escape", async () => {
    const w = widget();
    await w.find("button").trigger("click");
    expect(w.attributes("data-open")).toBe("");
    const dialog = w.find("[role='dialog']");
    const title = dialog.find("h2");
    expect(dialog.attributes("aria-labelledby")).toBe(title.attributes("id"));
    expect(title.text()).toBe("Chat with us");
    expect(w.emitted("update:open")?.[0]).toEqual([true]);
    await dialog.trigger("keydown", { key: "Escape" });
    expect(w.find("[role='dialog']").exists()).toBe(false);
    expect(w.emitted("update:open")?.[1]).toEqual([false]);
  });

  it("renders the greeting, messages and quick questions, and sends a starter", async () => {
    const onSend = vi.fn(async () => {});
    const w = widget({ defaultOpen: true, starters: ["Pricing"], onSend });
    expect(w.text()).toContain("Hi! How can we help you today?");
    expect(w.text()).toContain("Hello there");
    const starter = w.find("[role='group'] button");
    expect(starter.text()).toBe("Pricing");
    await starter.trigger("click");
    expect(onSend).toHaveBeenCalledWith("Pricing", []);
  });

  it("hides the starters once the visitor has written", () => {
    const w = widget({ defaultOpen: true, starters: ["Pricing"], messages: [...msgs, { id: "2", from: "visitor", text: "Hi", at: 0 }] });
    expect(w.find("[role='group']").exists()).toBe(false);
  });

  it("keeps the text and shows the error when onSend resolves with one", async () => {
    const onSend = vi.fn(async () => ({ error: "Nope" }));
    const w = widget({ defaultOpen: true, onSend });
    const field = w.find("textarea");
    await field.setValue("hello");
    await field.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(onSend).toHaveBeenCalledWith("hello", []);
    expect(w.find("p[role='alert']").text()).toBe("Nope");
    expect((w.find("textarea").element as HTMLTextAreaElement).value).toBe("hello");
  });

  it("swaps the composer for the offline form and validates it", async () => {
    const onOfflineSubmit = vi.fn(async () => {});
    const w = widget({ defaultOpen: true, online: false, onOfflineSubmit });
    expect(w.attributes("data-online")).toBeUndefined();
    expect(w.find("[data-slot='chat-composer']").exists()).toBe(false);
    expect(w.text()).toContain("We are not around right now");
    const form = w.find("[data-slot='chat-widget-offline']");
    await form.trigger("submit");
    expect(form.text()).toContain("Required");
    expect(onOfflineSubmit).not.toHaveBeenCalled();
    const inputs = form.findAll("input, textarea");
    await inputs[0]!.setValue("Sam");
    await inputs[1]!.setValue("nope");
    await inputs[2]!.setValue("Help");
    await form.trigger("submit");
    expect(form.text()).toContain("Enter a valid email address");
    await inputs[1]!.setValue("sam@example.com");
    await form.trigger("submit");
    await flushPromises();
    expect(onOfflineSubmit).toHaveBeenCalledWith({ name: "Sam", email: "sam@example.com", message: "Help" });
    expect(w.find("[data-slot='chat-widget-sent']").text()).toContain("Thanks, we got it");
  });

  it("speaks Arabic and mirrors under an Arabic provider", () => {
    const w = mount(() => h(NasaqProvider, { locale: "ar" }, () => h(NqChatWidget, { messages: [], onSend: async () => {}, defaultOpen: true })));
    expect(w.find("h2").text()).toBe("تحدث معنا");
    expect(w.find("[data-slot='chat-widget']").classes()).toContain("end-4");
  });
});
