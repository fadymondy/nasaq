import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqRepositoryPicker, filterBranches, moveIndex, pickDefaultBranch, sortBranches, splitFullName } from ".";

const REPOS = [
  { id: "1", fullName: "acme/storefront", private: true, language: "TypeScript", stars: 1200 },
  { id: "2", fullName: "acme/api", defaultBranch: "main" },
];
const BRANCHES = [{ name: "develop" }, { name: "main", default: true }];

describe("repository-picker logic", () => {
  it("splits, filters, sorts and picks defaults", () => {
    expect(splitFullName("acme/api")).toEqual({ owner: "acme", name: "api" });
    expect(splitFullName("solo")).toEqual({ owner: "", name: "solo" });
    expect(filterBranches(BRANCHES, "DEV")).toEqual([{ name: "develop" }]);
    expect(sortBranches(BRANCHES)[0]!.name).toBe("main");
    expect(pickDefaultBranch([{ name: "master" }, { name: "x" }])).toBe("master");
    expect(moveIndex(-1, -1, 3)).toBe(2);
    expect(moveIndex(2, 1, 3)).toBe(0);
  });
});

describe("NqRepositoryPicker", () => {
  it("searches when opened, picks a repository, loads branches and selects the default", async () => {
    const searchRepositories = vi.fn(async () => REPOS);
    const loadBranches = vi.fn(async () => BRANCHES);
    const w = mount(NqRepositoryPicker, { props: { searchRepositories, loadBranches }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("repository-picker");
    const [repoTrigger, branchTrigger] = w.findAll('[data-slot="popover-trigger"]');
    expect(branchTrigger!.attributes("disabled")).toBeDefined();

    await repoTrigger!.trigger("click");
    await vi.waitFor(() => expect(document.querySelectorAll('[role="option"]').length).toBe(2));
    expect(searchRepositories).toHaveBeenCalledWith("");
    expect(document.body.textContent).toContain("Private");
    document.querySelectorAll<HTMLElement>('[role="option"]')[0]!.click();
    await flushPromises();
    await vi.waitFor(() => expect(loadBranches).toHaveBeenCalled());
    await flushPromises();
    const value = w.emitted("update:modelValue")!;
    expect(value[0]![0]).toMatchObject({ branch: null });
    expect(value.at(-1)![0]).toMatchObject({ repo: { id: "1" }, branch: "main" });
    w.unmount();
  });

  it("controlled value renders the owner, name and branch; failed search shows retry", async () => {
    const searchRepositories = vi.fn(async () => {
      throw new Error("x");
    });
    const w = mount(NqRepositoryPicker, {
      props: { modelValue: { repo: REPOS[0]!, branch: "main" }, searchRepositories, loadBranches: async () => BRANCHES },
      attachTo: document.body,
    });
    const [repoTrigger] = w.findAll('[data-slot="popover-trigger"]');
    expect(repoTrigger!.text()).toContain("storefront");
    expect(w.text()).toContain("main");
    await repoTrigger!.trigger("click");
    await vi.waitFor(() => expect(document.body.textContent).toContain("Could not load"));
    expect([...document.querySelectorAll("button")].some((b) => b.textContent?.includes("Try again"))).toBe(true);
    w.unmount();
  });
});
