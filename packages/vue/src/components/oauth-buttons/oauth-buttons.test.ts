import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { NqOAuthButtons, NqOAuthDivider, NqGitHubLogo, NqAppleLogo } from ".";

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("NqOAuthButtons", () => {
  it("renders a labelled group with one official-logo button per provider", () => {
    const w = mount(NqOAuthButtons, { props: { providers: ["google", "github", "apple", "microsoft"], onSelect: () => {} } });
    expect(w.attributes("role")).toBe("group");
    expect(w.attributes("aria-label")).toBe("Sign in with a provider");
    expect(w.attributes("data-layout")).toBe("stack");
    const buttons = w.findAll('[data-slot="oauth-button"]');
    expect(buttons.map((b) => b.attributes("data-provider"))).toEqual(["google", "github", "apple", "microsoft"]);
    expect(buttons[0]!.text()).toBe("Continue with Google");
    expect(buttons[0]!.find("bdi").text()).toBe("Google");
    expect(buttons[0]!.find("svg").attributes("aria-hidden")).toBe("true");
    expect(buttons[0]!.classes()).toEqual(expect.arrayContaining(["relative", "w-full", "gap-3", "justify-center"]));
    // Google's glyph keeps its four brand colours.
    expect(buttons[0]!.findAll("path").map((p) => p.attributes("fill"))).toEqual(["#4285F4", "#34A853", "#FBBC04", "#E94235"]);
    // Apple is the black button with the white logo on light pages.
    expect(buttons[2]!.classes()).toEqual(expect.arrayContaining(["bg-black", "text-white"]));
    expect(buttons[2]!.find("path").attributes("fill")).toBe("white");
    expect(buttons[3]!.findAll("rect").map((r) => r.attributes("fill"))).toEqual(["#f25022", "#00a4ef", "#7fba00", "#ffb900"]);
  });

  it("uses the intent verb and the Arabic strings in an Arabic document", () => {
    const w = mount(NqOAuthButtons, { props: { providers: ["google"], intent: "signup", onSelect: () => {} } });
    expect(w.text()).toBe("Sign up with Google");
    document.documentElement.lang = "ar";
    const ar = mount(NqOAuthButtons, { props: { providers: ["google"], onSelect: () => {} } });
    expect(ar.attributes("aria-label")).toBe("تسجيل الدخول عبر مزوّد");
    expect(ar.text()).toBe("المتابعة باستخدام Google");
    document.documentElement.lang = "";
  });

  it("icon-only shows square buttons named by aria-label and title, no text", () => {
    const w = mount(NqOAuthButtons, { props: { providers: ["github"], layout: "icon-only", onSelect: () => {} } });
    const b = w.get('[data-slot="oauth-button"]');
    expect(b.attributes("aria-label")).toBe("Continue with GitHub");
    expect(b.attributes("title")).toBe("Continue with GitHub");
    expect(b.text()).toBe("");
    expect(b.classes()).toContain("size-control");
  });

  it("a promise from onSelect puts that button in loading and disables the others until it settles", async () => {
    let done!: () => void;
    const onSelect = vi.fn(() => new Promise<void>((r) => (done = r)));
    const w = mount(NqOAuthButtons, { props: { providers: ["google", "github"], onSelect } });
    const [google, github] = w.findAll('[data-slot="oauth-button"]');
    await google!.trigger("click");
    expect(onSelect).toHaveBeenCalledWith("google");
    expect(google!.attributes("aria-busy")).toBe("true");
    expect(google!.find('[data-slot="spinner"]').exists()).toBe(true);
    expect(google!.find('svg[viewBox="10 10 20 20"]').exists()).toBe(false);
    expect(github!.attributes("disabled")).toBeDefined();
    done();
    await flush();
    expect(google!.attributes("aria-busy")).toBeUndefined();
    expect(github!.attributes("disabled")).toBeUndefined();
  });

  it("pendingProvider keeps one provider loading from outside; disabled disables all", () => {
    const w = mount(NqOAuthButtons, { props: { providers: ["google", "github"], pendingProvider: "github", onSelect: () => {} } });
    const [google, github] = w.findAll('[data-slot="oauth-button"]');
    expect(github!.attributes("aria-busy")).toBe("true");
    expect(google!.attributes("disabled")).toBeDefined();
    const d = mount(NqOAuthButtons, { props: { providers: ["google"], disabled: true, onSelect: () => {} } });
    expect(d.get("button").attributes("disabled")).toBeDefined();
  });

  it("shows the Last used badge, and custom providers render their own icon and label", () => {
    const Icon = defineComponent({ render: () => h("svg", { "data-testid": "okta" }) });
    const w = mount(NqOAuthButtons, {
      props: { providers: ["github", { id: "okta", label: "Continue with Okta", icon: Icon }], lastUsed: "github", onSelect: () => {} },
    });
    const [github, okta] = w.findAll('[data-slot="oauth-button"]');
    expect(github!.get('[data-slot="last-used"]').text()).toBe("Last used");
    expect(github!.get('[data-slot="last-used"]').classes()).toContain("absolute");
    expect(okta!.find('[data-testid="okta"]').exists()).toBe(true);
    expect(okta!.text()).toBe("Continue with Okta");
  });
});

describe("logos and divider", () => {
  it("GitHub and Apple swap black and white only, never the shape", () => {
    expect(mount(NqGitHubLogo).get("path").attributes("fill")).toBe("black");
    expect(mount(NqGitHubLogo, { props: { onDark: true } }).get("path").attributes("fill")).toBe("white");
    expect(mount(NqAppleLogo).get("path").attributes("fill")).toBe("black");
    expect(mount(NqAppleLogo).get("svg").attributes("viewBox")).toBe("20 15.5 16 20");
  });

  it("the divider is a separator with a bilingual default word", () => {
    const w = mount(NqOAuthDivider);
    expect(w.attributes("role")).toBe("separator");
    expect(w.text()).toBe("or");
    expect(mount(NqOAuthDivider, { slots: { default: "or continue with email" } }).text()).toBe("or continue with email");
  });
});
