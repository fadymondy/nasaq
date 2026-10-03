import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import { formatCountdown } from "./auth-utils";
import { isEmail, NqAuthEmblem, NqAuthErrorSummary, NqAuthFooter, NqAuthLayout, NqAuthOrigin, useAuthForm } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("NqAuthLayout", () => {
  it("renders the card variant: emblem, h1, description, form, prompt, footer", () => {
    const w = mount(NqAuthLayout, {
      props: { title: "Sign in", description: "Use your email.", class: "extra" },
      slots: { default: "<form>FORM</form>", prompt: "No account? <a href='/x'>Create</a>", footer: "Small print" },
    });
    expect(w.attributes("data-slot")).toBe("auth-layout");
    expect(w.attributes("data-variant")).toBe("card");
    expect(w.classes()).toContain("extra");
    expect(w.find("h1").text()).toBe("Sign in");
    expect(w.find('[data-slot="auth-layout-header"] p').text()).toBe("Use your email.");
    expect(w.find('[data-slot="auth-backdrop"]').attributes("aria-hidden")).toBe("true");
    expect(w.find('[data-slot="auth-emblem"]').attributes("aria-hidden")).toBe("true");
    expect(w.find("[data-auth-card]").find("form").exists()).toBe(true);
    expect(w.find('[data-slot="auth-layout-prompt"] a').attributes("href")).toBe("/x");
    expect(w.find('[data-slot="auth-layout-footer"]').text()).toBe("Small print");
  });

  it("split variant has a panel and no card, and hides the mark when asked", () => {
    const w = mount(NqAuthLayout, { props: { variant: "split", title: "Welcome", mark: false, backdrop: false }, slots: { default: "<form>F</form>", panel: "<p>Panel</p>" } });
    expect(w.attributes("data-variant")).toBe("split");
    expect(w.find('[data-slot="auth-layout-panel"]').text()).toBe("Panel");
    expect(w.find('[data-slot="auth-layout-mark"]').exists()).toBe(false);
    expect(w.find('[data-slot="auth-backdrop"]').exists()).toBe(false);
    expect(w.find('[data-slot="card"]').exists()).toBe(false);
    expect(w.find("main h1").text()).toBe("Welcome");
  });
});

describe("NqAuthEmblem", () => {
  it("draws four rings of cells, a core and a lock, sized in px", () => {
    const w = mount(NqAuthEmblem, { props: { size: 96, busy: true } });
    expect(w.findAll("[data-emblem-ring]")).toHaveLength(4);
    expect(w.findAll("[data-emblem-cell]")).toHaveLength(18 + 24 + 30 + 36);
    expect(w.find("[data-emblem-lock]").exists()).toBe(true);
    expect(w.attributes("style")).toContain("width: 96px");
    expect(w.attributes("data-busy")).toBe("true");
    expect(mount(NqAuthEmblem, { props: { lock: false } }).find("[data-emblem-lock]").exists()).toBe(false);
  });
});

describe("NqAuthOrigin and NqAuthFooter", () => {
  it("names the host after mount", async () => {
    vi.stubGlobal("isSecureContext", true);
    const w = mount(NqAuthOrigin);
    await flushPromises();
    expect(w.attributes("data-slot")).toBe("auth-origin");
    expect(w.find("bdi").attributes("dir")).toBe("ltr");
    expect(w.text()).toContain("Secure connection to");
  });

  it("warns when the page is not secure", async () => {
    vi.stubGlobal("isSecureContext", false);
    const w = mount(NqAuthOrigin);
    await flushPromises();
    expect(w.attributes("data-secure")).toBeUndefined();
    expect(w.text()).toContain("Not a secure connection");
  });

  it("says it in Arabic", async () => {
    vi.stubGlobal("isSecureContext", true);
    const w = mount(NasaqProvider, { props: { locale: "ar" }, slots: { default: () => h(NqAuthOrigin) } });
    await flushPromises();
    expect(w.text()).toContain("اتصال آمن بـ");
  });

  it("renders links, external ones in a new tab", () => {
    const w = mount(NqAuthFooter, { props: { links: [{ label: "Terms", href: "/t" }, { label: "Docs", href: "https://x.test", external: true }] }, slots: { end: "<b>EN</b>" } });
    const links = w.findAll("a");
    expect(links[0]!.attributes("target")).toBeUndefined();
    expect(links[1]!.attributes()).toMatchObject({ target: "_blank", rel: "noreferrer" });
    expect(w.find("b").text()).toBe("EN");
  });
});

describe("auth utils", () => {
  it("validates and formats", () => {
    expect(isEmail(" a@b.co ")).toBe(true);
    expect(isEmail("nope")).toBe(false);
    expect(formatCountdown(27)).toBe("0:27");
    expect(formatCountdown(125)).toBe("2:05");
  });

  it("useAuthForm validates locally, then shows a server error and a thrown fallback", async () => {
    const onSubmit = vi.fn().mockResolvedValueOnce({ error: "Wrong password" }).mockRejectedValueOnce(new Error("x"));
    let form!: ReturnType<typeof useAuthForm<{ email: string }>>;
    mount(
      defineComponent({
        setup() {
          form = useAuthForm<{ email: string }>({ onSubmit, validate: (v) => (v.email ? {} : { email: "Required" }), fallbackError: "Try again" });
          return () => h("form");
        },
      }),
    );
    await form.submit({ email: "" });
    expect(form.fieldErrors.value.email).toBe("Required");
    expect(onSubmit).not.toHaveBeenCalled();
    await form.submit({ email: "a@b.co" });
    expect(form.error.value).toBe("Wrong password");
    expect(form.fieldErrors.value).toEqual({});
    await form.submit({ email: "a@b.co" });
    expect(form.error.value).toBe("Try again");
    expect(form.pending.value).toBe(false);
  });
});

describe("NqAuthErrorSummary", () => {
  it("shows the server message, or the fields to fix, or nothing visible", async () => {
    const empty = mount(NqAuthErrorSummary, { props: { fieldErrors: {}, title: "Fix these" } });
    expect(empty.classes()).toContain("sr-only");
    const server = mount(NqAuthErrorSummary, { props: { error: "Down", fieldErrors: {}, title: "Fix these" } });
    expect(server.attributes("data-slot")).toBe("auth-error-summary");
    expect(server.text()).toContain("Down");
    const fields = mount(NqAuthErrorSummary, { props: { fieldErrors: { email: "Required" }, fieldLabels: { email: "Email" }, title: "Fix these" } });
    expect(fields.text()).toContain("Fix these");
    await fields.find("button").trigger("click");
    expect(fields.emitted("focusField")).toEqual([["email"]]);
    expect(fields.find("button").text()).toBe("Email: Required");
  });
});
