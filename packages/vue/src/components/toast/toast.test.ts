import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqToaster, toast } from ".";

describe("NqToaster", () => {
  it("labels the region and renders a toast with the Nasaq classes", async () => {
    const w = mount(NqToaster, { attachTo: document.body });
    toast.success("Invoice sent", { description: "To Acme" });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    const region = document.querySelector("section");
    expect(region?.getAttribute("aria-label")).toContain("Notifications");
    const item = document.querySelector<HTMLElement>("[data-sonner-toast]");
    expect(item).not.toBeNull();
    expect(item!.className).toContain("!rounded-floating");
    expect(item!.textContent).toContain("Invoice sent");
    expect(document.querySelector("[data-sonner-toaster]")?.getAttribute("data-x-position")).toBe("right");
    w.unmount();
  });
});
