import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NasaqProvider } from "../../provider";
import { NqImpersonationBanner } from ".";

const as = { name: "Sara Ali", email: "sara@example.com" };

describe("NqImpersonationBanner", () => {
  it("is a status region with the name, email and exit button", () => {
    const w = mount(NqImpersonationBanner, { props: { as, onExit: () => {} } });
    expect(w.attributes("role")).toBe("status");
    expect(w.attributes("data-slot")).toBe("impersonation-banner");
    expect(w.attributes("data-mode")).toBe("impersonate");
    expect(w.text()).toContain("You are viewing the app as Sara Ali.");
    expect(w.find("bdi").attributes("dir")).toBe("ltr");
    expect(w.classes()).toEqual(expect.arrayContaining(["bg-nq-warning-soft", "sticky"]));
    expect(w.find("button").text()).toBe("Exit impersonation");
  });

  it("preview mode swaps the tone and the words", () => {
    const w = mount(NqImpersonationBanner, { props: { as, mode: "preview", onExit: () => {}, sticky: false } });
    expect(w.classes()).toContain("bg-nq-info-soft");
    expect(w.classes()).not.toContain("sticky");
    expect(w.text()).toContain("Previewing as Sara Ali.");
    expect(w.find("button").text()).toBe("Exit preview");
  });

  it("shows busy while exiting and a failure when onExit rejects", async () => {
    const onExit = vi.fn().mockRejectedValue(new Error("no"));
    const w = mount(NqImpersonationBanner, { props: { as, onExit } });
    await w.find("button").trigger("click");
    await vi.waitFor(() => expect(w.find('[role="alert"]').exists()).toBe(true));
    expect(w.find('[role="alert"]').text()).toBe("Could not exit. Try again.");
    expect(w.find("button").attributes("aria-busy")).toBeUndefined();
    expect(onExit).toHaveBeenCalledTimes(1);
    await nextTick();
  });

  it("is Arabic inside an Arabic provider", () => {
    const w = mount({ components: { NasaqProvider, NqImpersonationBanner }, setup: () => ({ as, onExit: () => {} }), template: `<NasaqProvider locale="ar" target="scope"><NqImpersonationBanner :as="as" :on-exit="onExit" /></NasaqProvider>` });
    expect(w.text()).toContain("أنت تتصفح التطبيق بصفة Sara Ali.");
    expect(w.find("button").text()).toBe("إنهاء انتحال الصفة");
  });
});
