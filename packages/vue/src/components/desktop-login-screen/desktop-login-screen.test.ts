import { flushPromises, mount } from "@vue/test-utils";
import { Moon, Power } from "lucide-vue-next";
import { describe, expect, it, vi } from "vitest";
import { NqDesktopLoginScreen } from ".";

const now = new Date(2026, 8, 29, 9, 0, 0);

describe("NqDesktopLoginScreen", () => {
  it("renders the frozen clock, a greeting, the card and the login form", () => {
    const w = mount(NqDesktopLoginScreen, { props: { now, title: "ToGO OS", onSubmit: async () => {} }, attrs: { class: "extra" } });
    expect(w.attributes("data-slot")).toBe("desktop-login-screen");
    expect(w.classes()).toContain("extra");
    expect(w.find("time").text()).toBe("09:00");
    expect(w.find('[data-slot="desktop-login-screen-clock"] p').text()).toBe("Good morning");
    expect(w.find("h1").text()).toBe("ToGO OS");
    expect(w.find('section[aria-labelledby="desktop-login-title"]').exists()).toBe(true);
    expect(w.find('[data-slot="desktop-login-screen-mark"]').exists()).toBe(true);
    expect(w.find('[data-slot="login-form"]').exists()).toBe(true);
  });

  it("greets by the hour and can hide the clock", () => {
    const evening = mount(NqDesktopLoginScreen, { props: { now: new Date(2026, 8, 29, 20, 5), onSubmit: async () => {} } });
    expect(evening.find('[data-slot="desktop-login-screen-clock"] p').text()).toBe("Good evening");
    expect(evening.find("h1").text()).toBe("Sign in");
    const none = mount(NqDesktopLoginScreen, { props: { now, showClock: false, showMark: false, onSubmit: async () => {} } });
    expect(none.find('[data-slot="desktop-login-screen-clock"]').exists()).toBe(false);
    expect(none.find('[data-slot="desktop-login-screen-mark"]').exists()).toBe(false);
  });

  it("hands the form values to onSubmit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqDesktopLoginScreen, { props: { now, onSubmit } });
    await w.find('input[type="email"]').setValue("a@b.co");
    await w.find('input[name="password"]').setValue("pw");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: "a@b.co", password: "pw" }));
  });

  it("the default slot replaces the form; footer and description render", () => {
    const w = mount(NqDesktopLoginScreen, { props: { now, description: "Pick a user" }, slots: { default: "<button id='pick'>Sara</button>", footer: "No account?" } });
    expect(w.find("#pick").exists()).toBe(true);
    expect(w.find('[data-slot="login-form"]').exists()).toBe(false);
    expect(w.text()).toContain("Pick a user");
    expect(w.text()).toContain("No account?");
  });

  it("renders power actions as labelled buttons", async () => {
    const sleep = vi.fn();
    const w = mount(NqDesktopLoginScreen, { props: { now, powerActions: [{ id: "sleep", label: "Sleep", icon: Moon, onSelect: sleep }, { id: "off", label: "Shut down", icon: Power, onSelect: () => {} }] } });
    const nav = w.find('nav[data-slot="desktop-login-screen-power"]');
    expect(nav.attributes("aria-label")).toBe("Power options");
    const buttons = nav.findAll("button");
    expect(buttons.map((b) => b.attributes("aria-label"))).toEqual(["Sleep", "Shut down"]);
    await buttons[0]!.trigger("click");
    expect(sleep).toHaveBeenCalled();
  });
});
