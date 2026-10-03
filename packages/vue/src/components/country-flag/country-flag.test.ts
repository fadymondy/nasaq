import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqCountryFlag } from ".";

const SVG = '<svg viewBox="0 0 3 2"><rect width="3" height="2"/></svg>';

afterEach(() => vi.unstubAllGlobals());

describe("NqCountryFlag", () => {
  it("is decorative without a label, an image with one, and loads the svg once", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => SVG }));
    vi.stubGlobal("fetch", fetchMock);
    const w = mount(NqCountryFlag, { props: { code: "sa" } });
    expect(w.attributes("aria-hidden")).toBe("true");
    expect(w.attributes("role")).toBeUndefined();
    expect(w.classes()).toEqual(expect.arrayContaining(["aspect-[3/2]", "h-[1em]", "bg-muted"]));
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/SA.svg"));
    expect(w.find("svg").exists()).toBe(true);

    const named = mount(NqCountryFlag, { props: { code: "SA", label: "Saudi Arabia" } });
    expect(named.attributes("role")).toBe("img");
    expect(named.attributes("aria-label")).toBe("Saudi Arabia");
    expect(named.attributes("aria-hidden")).toBeUndefined();
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("an unknown code stays an empty frame", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, text: async () => "" })));
    const w = mount(NqCountryFlag, { props: { code: "QQ" } });
    await flushPromises();
    expect(w.find("svg").exists()).toBe(false);
  });
});
