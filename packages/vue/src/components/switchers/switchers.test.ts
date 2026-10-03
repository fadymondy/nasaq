import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqLocaleSwitcher, NqThemeSwitcher, NqThemeToggle, THEME_OPTIONS, useThemeLabels } from ".";

afterEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});

const wrap = (child: () => unknown, props: Record<string, unknown> = {}) =>
  mount(defineComponent({ render: () => h(NasaqProvider, { target: "scope", defaultTheme: "light", ...props }, () => child()) }), { attachTo: document.body });

describe("switchers", () => {
  it("THEME_OPTIONS lists light, dark, system", () => {
    expect(THEME_OPTIONS.map((o) => o.value)).toEqual(["light", "dark", "system"]);
  });

  it("ThemeSwitcher renders three options and marks the active one pressed", async () => {
    const w = wrap(() => h(NqThemeSwitcher));
    await flushPromises();
    const root = w.find('[data-slot="theme-switcher"]');
    expect(root.attributes("aria-label")).toBe("Theme");
    const items = root.findAll("button");
    expect(items).toHaveLength(3);
    expect(items[0]!.attributes("data-pressed")).toBe("");
    expect(items[1]!.attributes("aria-label")).toBe("Dark");
    await items[1]!.trigger("click");
    await flushPromises();
    expect(root.findAll("button")[1]!.attributes("data-pressed")).toBe("");
    w.unmount();
  });

  it("ThemeToggle flips light and dark and exposes data-state", async () => {
    const w = wrap(() => h(NqThemeToggle, { sound: false }));
    await flushPromises();
    const btn = w.find('[data-slot="theme-toggle"]');
    expect(btn.attributes("data-state")).toBe("light");
    expect(btn.attributes("aria-label")).toBe("Switch to dark theme");
    await btn.trigger("click");
    await flushPromises();
    expect(w.find('[data-slot="theme-toggle"]').attributes("data-state")).toBe("dark");
    w.unmount();
  });

  it("uses Arabic labels in an Arabic provider", async () => {
    const w = wrap(() => h(NqThemeToggle, { sound: false }), { defaultLocale: "ar" });
    await flushPromises();
    expect(w.find('[data-slot="theme-toggle"]').attributes("aria-label")).toBe("التبديل إلى المظهر الداكن");
    w.unmount();
  });

  it("LocaleSwitcher shows the current language and an accessible name", async () => {
    const w = wrap(() => h(NqLocaleSwitcher, { showLabel: true }));
    await flushPromises();
    expect(w.text()).toContain("English");
    const icon = wrap(() => h(NqLocaleSwitcher));
    await flushPromises();
    expect(icon.find("button").attributes("aria-label")).toBe("Language: English");
    w.unmount();
    icon.unmount();
  });

  it("useThemeLabels merges overrides", () => {
    let labels!: ReturnType<typeof useThemeLabels>;
    mount(
      defineComponent({
        setup() {
          labels = useThemeLabels({ light: "Day" });
          return () => null;
        },
      }),
    );
    expect(labels.light).toBe("Day");
    expect(labels.dark).toBe("Dark");
  });
});
