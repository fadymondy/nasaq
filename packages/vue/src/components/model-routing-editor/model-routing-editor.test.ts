import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqModelRoutingEditor, routingIssues, validateProvider, type RoutingValue } from ".";

const taskClasses = [
  { id: "chat", label: "Chat" },
  { id: "vision", label: "Vision", modality: "vision" as const },
];
const models = [
  { id: "sonnet", label: "Sonnet", modalities: ["text", "vision"] as const },
  { id: "haiku", label: "Haiku" },
];
const providers = [{ id: "cloud", name: "Cloud API", kind: "cloud" as const, endpoint: "https://api.example.com", modalities: ["text", "vision"] as const, status: "online" as const }];
const defaultValue: RoutingValue = { auto: false, routes: { chat: { model: "sonnet", fallback: "haiku" }, vision: { model: "sonnet" } }, backend: "cloud" };

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  document.documentElement.removeAttribute("dir");
  document.documentElement.lang = "en";
});

describe("routing math", () => {
  it("reports issues and validates providers", () => {
    const v: RoutingValue = { auto: false, routes: { chat: { model: "sonnet", fallback: "sonnet" } } };
    expect(routingIssues(v, taskClasses, models).map((i) => `${i.taskId}:${i.kind}`)).toEqual(["chat:same", "vision:missing"]);
    expect(validateProvider({ name: "", endpoint: "nope", modalities: [] }, providers)).toEqual({ name: "required", endpoint: "invalid", modalities: "required" });
  });
});

describe("NqModelRoutingEditor", () => {
  it("renders routes and providers", () => {
    const w = mount(NqModelRoutingEditor, { props: { taskClasses, models, providers, defaultValue } });
    expect(w.find('[data-slot="model-routing-editor"]').exists()).toBe(true);
    expect(w.findAll('[data-slot="routing-route"]')).toHaveLength(2);
    expect(w.findAll('[data-slot="routing-provider"]')).toHaveLength(1);
    expect(w.find('[data-slot="routing-provider"]').attributes("data-active")).toBeDefined();
    expect(w.find('[data-slot="routing-footer"]').exists()).toBe(false);
  });

  it("toggles auto, becomes dirty and saves", async () => {
    const onSave = vi.fn(async () => {});
    const w = mount(NqModelRoutingEditor, { props: { taskClasses, models, providers, defaultValue, onSave }, attachTo: document.body });
    expect(w.find('[role="status"]').text()).toBe("");
    await w.find('button[role="switch"]').trigger("click");
    expect(w.find('[role="status"]').text()).not.toBe("");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect((onSave.mock.calls[0] as unknown as [RoutingValue])[0].auto).toBe(true);
    w.unmount();
  });

  it("shows the failure when save returns an error", async () => {
    const onSave = vi.fn(async () => ({ error: "Nope" }));
    const w = mount(NqModelRoutingEditor, { props: { taskClasses, models, providers, defaultValue, onSave } });
    await w.find('button[role="switch"]').trigger("click");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Nope");
  });

  it("blocks save while a route is missing a model", async () => {
    const onSave = vi.fn();
    const w = mount(NqModelRoutingEditor, { props: { taskClasses, models, providers, defaultValue: { auto: false, routes: {} }, onSave } });
    await w.find("form").trigger("submit");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("registers a provider through the dialog", async () => {
    const onRegisterProvider = vi.fn(async () => {});
    const w = mount(NqModelRoutingEditor, { props: { taskClasses, models, providers, defaultValue, onRegisterProvider }, attachTo: document.body });
    const add = w.findAll("button").find((b) => b.text().length > 0 && !b.attributes("role") && b.attributes("type") !== "submit" && !b.attributes("aria-label"))!;
    await add.trigger("click");
    await flushPromises();
    const dlg = document.body.querySelector('[data-slot="routing-register"]')!;
    expect(dlg).toBeTruthy();
    const inputs = dlg.querySelectorAll("input");
    (inputs[0] as HTMLInputElement).value = "Edge";
    inputs[0]!.dispatchEvent(new Event("input"));
    (inputs[1] as HTMLInputElement).value = "https://edge.example.com";
    inputs[1]!.dispatchEvent(new Event("input"));
    dlg.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(onRegisterProvider).toHaveBeenCalledWith({ name: "Edge", kind: "cloud", endpoint: "https://edge.example.com", modalities: ["text"] });
    w.unmount();
  });

  it("renders Arabic strings", () => {
    const Host = { components: { NasaqProvider, NqModelRoutingEditor }, setup: () => ({ taskClasses, models, providers, defaultValue }), template: `<NasaqProvider locale="ar"><NqModelRoutingEditor :task-classes="taskClasses" :models="models" :providers="providers" :default-value="defaultValue" /></NasaqProvider>` };
    const w = mount(Host);
    expect(/[؀-ۿ]/.test(w.text())).toBe(true);
  });
});
