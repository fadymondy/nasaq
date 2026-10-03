import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqStatusPageManager, isValidStatusSlug, moveStatusPageItem, type StatusPageSettings } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const settings: StatusPageSettings = {
  title: "Nasaq status",
  slug: "nasaq",
  services: [
    { id: "api", name: "API", visible: true },
    { id: "web", name: "Website", visible: true },
    { id: "db", name: "Database", visible: false },
  ],
};
const incidents = [{ id: "i1", title: "Slow API", status: "monitoring" as const, impact: "minor" as const, startedAt: "2026-09-28T10:00:00Z" }];

describe("status page helpers", () => {
  it("validates slugs and moves items", () => {
    expect(isValidStatusSlug("my-page-2")).toBe(true);
    expect(isValidStatusSlug("My Page")).toBe(false);
    expect(moveStatusPageItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moveStatusPageItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
  });
});

describe("NqStatusPageManager", () => {
  it("renders the settings, the services and the incidents", () => {
    const w = mount(NqStatusPageManager, { props: { settings, incidents, publicUrl: "https://status.nasaq.dev", onSave: async () => {}, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("status-page-manager");
    expect(w.classes()).toContain("extra");
    expect(w.get("h3").text()).toBe("Status page");
    expect(w.findAll('[data-slot="managed-service"]')).toHaveLength(3);
    expect(w.text()).toContain("Hidden");
    expect(w.text()).toContain("Slow API");
    expect(w.get("a").attributes("href")).toBe("https://status.nasaq.dev");
    expect(w.text()).not.toContain("Post incident");
  });

  it("stages changes until saved, then saves the draft", async () => {
    const onSave = vi.fn(async () => {});
    const w = mount(NqStatusPageManager, { props: { settings, onSave } });
    const save = () => w.findAll("button").find((b) => b.text() === "Save changes")!;
    expect(save().attributes("disabled")).toBeDefined();
    await w.get('[aria-label="Move Website up"]').trigger("click");
    expect(w.text()).toContain("Unsaved changes");
    expect(w.findAll('[data-slot="managed-service"]')[0]!.text()).toContain("Website");
    await save().trigger("click");
    await flushPromises();
    expect(onSave).toHaveBeenCalledTimes(1);
    const sent = (onSave.mock.calls[0] as unknown as [StatusPageSettings])[0];
    expect(sent.services.map((s) => s.id)).toEqual(["web", "api", "db"]);
    expect(sent.domain).toBeUndefined();
  });

  it("discards the staged changes and validates the slug", async () => {
    const onSave = vi.fn(async () => {});
    const w = mount(NqStatusPageManager, { props: { settings, onSave } });
    await w.get('[aria-label="Move API down"]').trigger("click");
    await w.findAll("button").find((b) => b.text() === "Discard")!.trigger("click");
    expect(w.findAll('[data-slot="managed-service"]')[0]!.text()).toContain("API");
    const slug = w.findAll("input")[1]!;
    await slug.setValue("Bad Slug");
    await w.findAll("button").find((b) => b.text() === "Save changes")!.trigger("click");
    expect(onSave).not.toHaveBeenCalled();
    expect(w.text()).toContain("Use lowercase letters, numbers and dashes only.");
  });

  it("shows the error the host returns", async () => {
    const w = mount(NqStatusPageManager, { props: { settings, onSave: async () => ({ error: "Slug taken" }) } });
    await w.get('[aria-label="Move API down"]').trigger("click");
    await w.findAll("button").find((b) => b.text() === "Save changes")!.trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Slug taken");
  });

  it("posts an incident from the dialog", async () => {
    const onPostIncident = vi.fn(async () => {});
    const w = mount(NqStatusPageManager, { props: { settings, onSave: async () => {}, onPostIncident }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text() === "Post incident")!.trigger("click");
    await flushPromises();
    const form = document.querySelector<HTMLFormElement>("form")!;
    expect(form).not.toBeNull();
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await flushPromises();
    expect(onPostIncident).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("This field is required.");
    const input = form.querySelector<HTMLInputElement>("input")!;
    input.value = "API down";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const area = form.querySelector<HTMLTextAreaElement>("textarea")!;
    area.value = "We are looking into it";
    area.dispatchEvent(new Event("input", { bubbles: true }));
    const box = form.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    box.checked = true;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    await flushPromises();
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await flushPromises();
    expect(onPostIncident).toHaveBeenCalledWith({ title: "API down", body: "We are looking into it", impact: "minor", status: "investigating", serviceIds: ["api"] });
  });

  it("speaks Arabic", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqStatusPageManager, { settings, onSave: async () => {} })) });
    expect(w.get("h3").text()).toBe("صفحة الحالة");
    expect(w.text()).toContain("مخفية");
  });
});
