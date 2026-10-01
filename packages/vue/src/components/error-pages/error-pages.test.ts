import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqComingSoonPage, NqErrorPage, NqMaintenancePage, NqNotFoundPage, NqOfflinePage, NqServerErrorPage, statusCodeFor } from ".";

describe("NqErrorPage", () => {
  it("is a main with the kind, a code and one h1", () => {
    const w = mount(NqNotFoundPage);
    expect(w.element.tagName).toBe("MAIN");
    expect(w.attributes("data-slot")).toBe("error-page");
    expect(w.attributes("data-kind")).toBe("not-found");
    expect(w.classes()).toContain("min-h-dvh");
    expect(w.get('[data-slot="error-page-code"]').text()).toBe("404");
    expect(w.get("h1").text()).toBe("We could not find that page");
    expect(w.find('[data-slot="product-logo"]').exists()).toBe(true);
    expect(statusCodeFor("offline")).toBeUndefined();
  });

  it("shows a button only when its handler is passed", async () => {
    const onHome = vi.fn();
    const w = mount(NqNotFoundPage, { props: { onHome, onBack: undefined } });
    const buttons = w.findAll("button");
    expect(buttons).toHaveLength(1);
    await buttons[0]!.trigger("click");
    expect(onHome).toHaveBeenCalled();
  });

  it("server error is an alert with a copyable error id; async retry shows busy", async () => {
    let done!: () => void;
    const onRetry = vi.fn(() => new Promise<void>((r) => (done = r)));
    const w = mount(NqServerErrorPage, { props: { errorId: "err_9f2", onRetry } });
    expect(w.find('[role="alert"]').exists()).toBe(true);
    expect(w.text()).toContain("err_9f2");
    expect(w.find('[data-slot="copy-button"]').exists()).toBe(true);
    await w.findAll("button").find((b) => b.text().includes("Try again"))!.trigger("click");
    expect(w.findAll("button").find((b) => b.text().includes("Try again"))!.attributes("aria-busy")).toBe("true");
    done();
    await flushPromises();
    expect(w.findAll("button").find((b) => b.text().includes("Try again"))!.attributes("aria-busy")).toBeUndefined();
  });

  it("offline turns into back online, reload", () => {
    const w = mount(NqOfflinePage, { props: { online: true, onRetry: () => {} } });
    expect(w.get("h1").text()).toBe("You are back online");
    expect(w.get("button").text()).toBe("Reload");
    expect(w.get("span[aria-hidden]").classes()).toContain("text-nq-success-text");
  });

  it("maintenance shows the eta; coming-soon notify confirms", async () => {
    const m = mount(NqMaintenancePage, { props: { eta: "2026-10-01T10:00:00Z" } });
    expect(m.find("time").exists()).toBe(true);
    const onNotify = vi.fn(async () => {});
    const c = mount(NqComingSoonPage, { props: { moduleName: "Reports", onNotify, onHome: () => {} } });
    expect(c.get("h1").text()).toBe("Reports is coming soon");
    await c.get("button").trigger("click");
    await flushPromises();
    expect(c.get('[role="status"]').text()).toContain("Done");
  });

  it("code null hides the code, logo null hides the logo, fullScreen off drops min-h-dvh, Arabic labels", () => {
    const w = mount(NqErrorPage, { props: { kind: "forbidden", code: null, logo: null, fullScreen: false, labels: { forbiddenTitle: "Nope" } } });
    expect(w.find('[data-slot="error-page-code"]').exists()).toBe(false);
    expect(w.find('[data-slot="product-logo"]').exists()).toBe(false);
    expect(w.classes()).not.toContain("min-h-dvh");
    expect(w.get("h1").text()).toBe("Nope");
  });
});
