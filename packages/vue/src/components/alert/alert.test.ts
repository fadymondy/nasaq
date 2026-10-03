import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqAlert } from ".";

describe("NqAlert", () => {
  it("renders the React markup, classes and slots", () => {
    const w = mount(NqAlert, { props: { tone: "danger", title: "Sync failed", class: "mt-4" }, slots: { default: "Could not reach the data source." } });
    expect(w.attributes("data-slot")).toBe("alert");
    expect(w.attributes("data-tone")).toBe("danger");
    expect(w.attributes("role")).toBe("alert");
    expect(w.classes()).toEqual(expect.arrayContaining(["rounded-card", "border-nq-danger/30", "bg-nq-danger-soft", "mt-4"]));
    expect(w.find('[data-slot="alert-icon"]').classes()).toContain("text-nq-danger-text");
    expect(w.find('[data-slot="alert-title"]').text()).toBe("Sync failed");
    expect(w.find('[data-slot="alert-description"]').classes()).toContain("text-muted-foreground");
    expect(w.find('[data-slot="alert-actions"]').exists()).toBe(false);
  });

  it("info and success are polite status regions; role can be overridden", () => {
    expect(mount(NqAlert, { slots: { default: "Hi" } }).attributes("role")).toBe("status");
    expect(mount(NqAlert, { props: { tone: "success" } }).attributes("role")).toBe("status");
    expect(mount(NqAlert, { props: { tone: "warning" } }).attributes("role")).toBe("alert");
    expect(mount(NqAlert, { props: { role: "note" } }).attributes("role")).toBe("note");
  });

  it("a one-line notice uses foreground text", () => {
    const w = mount(NqAlert, { props: { tone: "warning" }, slots: { default: "Draft" } });
    expect(w.find('[data-slot="alert-title"]').exists()).toBe(false);
    expect(w.find('[data-slot="alert-description"]').classes()).toContain("text-foreground");
  });

  it("shows action and a dismiss button that emits", async () => {
    const w = mount(NqAlert, { props: { dismissible: true }, slots: { default: "Hi", action: "<button>Update card</button>" } });
    expect(w.find('[data-slot="alert-actions"]').text()).toContain("Update card");
    const dismiss = w.find('[aria-label="Dismiss"]');
    expect(dismiss.exists()).toBe(true);
    await dismiss.trigger("click");
    expect(w.emitted("dismiss")).toHaveLength(1);
  });
});
