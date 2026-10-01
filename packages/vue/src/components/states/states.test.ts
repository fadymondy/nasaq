import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { NqButton } from "../button";
import { NasaqProvider } from "../../provider";
import { NqEmptyState, NqErrorState, NqLoadingState, NqSkeleton } from ".";

describe("states", () => {
  it("empty state shows icon, title, description and actions", () => {
    const w = mount(NqEmptyState, {
      props: { title: "No issues", description: "Create one.", hatch: true, class: "mt-2" },
      slots: { actions: () => h(NqButton, null, () => "New") },
    });
    const root = w.find('[data-slot="empty-state"]');
    expect(root.classes()).toEqual(expect.arrayContaining(["border-dashed", "rounded-card", "hatch", "mt-2"]));
    expect(w.find('[data-slot="state-icon"]').classes()).toContain("text-muted-foreground");
    expect(w.find("p.text-label").text()).toBe("No issues");
    expect(w.find("p.text-body-sm").text()).toBe("Create one.");
    expect(w.find(".mt-1.flex").text()).toBe("New");
  });

  it("error state is an alert with a danger icon", () => {
    const w = mount(NqErrorState, { props: { title: "Failed" } });
    const root = w.find('[data-slot="error-state"]');
    expect(root.attributes("role")).toBe("alert");
    expect(w.find('[data-slot="state-icon"]').classes()).toContain("text-nq-danger-text");
    expect(w.find(".mt-1.flex").exists()).toBe(false);
  });

  it("loading state announces itself, with skeleton rows or a spinner", () => {
    const w = mount(NqLoadingState, { props: { rows: 2 } });
    const root = w.find('[data-slot="loading-state"]');
    expect(root.attributes("role")).toBe("status");
    expect(root.attributes("aria-live")).toBe("polite");
    expect(w.find(".sr-only").text()).toBe("Loading…");
    expect(w.findAll('[data-slot="skeleton"]')).toHaveLength(4);
    const spin = mount(NqLoadingState, { props: { rows: 0, label: "Saving" } });
    expect(spin.find('[data-slot="spinner"]').exists()).toBe(true);
    expect(spin.text()).toContain("Saving");
  });

  it("loading label follows the Arabic locale", () => {
    const App = defineComponent({
      components: { NasaqProvider, NqLoadingState },
      template: `<NasaqProvider target="scope" default-locale="ar"><NqLoadingState /></NasaqProvider>`,
    });
    expect(mount(App).find(".sr-only").text()).toBe("جارٍ التحميل…");
  });

  it("skeleton is decorative and merges classes", () => {
    const w = mount(NqSkeleton, { props: { class: "h-3" } });
    expect(w.attributes("aria-hidden")).toBe("true");
    expect(w.classes()).toEqual(expect.arrayContaining(["bg-secondary", "h-3"]));
  });
});
