import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqCreateWorkspaceForm, NqWorkspaceList, NqWorkspaceOnboarding, NqWorkspaceSettings, workspaceDeletePhrase, workspaceSlugProblem, workspaceSlugify } from ".";

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const type = async (w: ReturnType<typeof mount>, sel: string, value: string) => {
  const input = w.find(sel);
  (input.element as HTMLInputElement).value = value;
  await input.trigger("input");
};

describe("slug helpers", () => {
  it("slugifies a name and finds problems", () => {
    expect(workspaceSlugify("  Sahab Studio! ")).toBe("sahab-studio");
    expect(workspaceSlugProblem("")).toBe("empty");
    expect(workspaceSlugProblem("ab")).toBe("short");
    expect(workspaceSlugProblem("Bad Slug")).toBe("format");
    expect(workspaceSlugProblem("good-one")).toBeNull();
    expect(workspaceDeletePhrase("  Acme ")).toBe("Acme");
  });
});

describe("NqCreateWorkspaceForm", () => {
  it("follows the name with the address and submits both", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqCreateWorkspaceForm, { props: { onSubmit }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("create-workspace-form");
    await type(w, 'input[autocomplete="organization"]', "Sahab Studio");
    expect((w.findAll("input")[1]!.element as HTMLInputElement).value).toBe("sahab-studio");
    await w.trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith({ name: "Sahab Studio", slug: "sahab-studio" });
    w.unmount();
  });

  it("asks for a name and keeps the form on a server error", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: "Nope", fieldErrors: { slug: "Taken already" } });
    const w = mount(NqCreateWorkspaceForm, { props: { onSubmit }, attachTo: document.body });
    await w.trigger("submit");
    expect(w.text()).toContain("Enter a name for the workspace.");
    expect(onSubmit).not.toHaveBeenCalled();
    await type(w, 'input[autocomplete="organization"]', "Acme");
    await w.trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Nope");
    expect(w.text()).toContain("Taken already");
    w.unmount();
  });

  it("checks the address after a pause and blocks a taken one", async () => {
    vi.useFakeTimers();
    const checkSlug = vi.fn().mockResolvedValue({ available: false });
    const onSubmit = vi.fn();
    const w = mount(NqCreateWorkspaceForm, { props: { onSubmit, checkSlug, defaultName: "Acme" }, attachTo: document.body });
    await vi.advanceTimersByTimeAsync(450);
    expect(checkSlug).toHaveBeenCalledWith("acme");
    expect(w.text()).toContain("That address is taken");
    await w.trigger("submit");
    expect(onSubmit).not.toHaveBeenCalled();
    w.unmount();
  });
});

describe("NqWorkspaceOnboarding", () => {
  it("renders a bare form with its heading", () => {
    const w = mount(NqWorkspaceOnboarding, { props: { bare: true, onSubmit: vi.fn() }, attachTo: document.body });
    expect(w.find("h1").text()).toBe("Create your workspace");
    expect(w.find('[data-slot="workspace-onboarding"]').exists()).toBe(true);
    w.unmount();
  });
});

describe("NqWorkspaceList", () => {
  const workspaces = [
    { id: "a", name: "Acme", slug: "acme", role: "Owner", members: 1, current: true },
    { id: "b", name: "Beta", slug: "beta", members: 3 },
  ];
  it("lists workspaces and opens one", async () => {
    const onOpen = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqWorkspaceList, { props: { workspaces, onOpen }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("workspace-list");
    expect(w.text()).toContain("1 member");
    expect(w.text()).toContain("3 members");
    expect(w.text()).toContain("Current");
    const buttons = w.findAll("button");
    expect(buttons[0]!.attributes("disabled")).toBeDefined();
    await buttons[1]!.trigger("click");
    expect(onOpen).toHaveBeenCalledWith(workspaces[1]);
    w.unmount();
  });
  it("shows an empty state with the create action, in Arabic", () => {
    document.documentElement.lang = "ar";
    const l = mount(NqWorkspaceList, { props: { workspaces: [], onOpen: vi.fn(), onCreate: vi.fn() }, attachTo: document.body });
    expect(l.text()).toContain("لست في أي مساحة عمل بعد");
    expect(l.text()).toContain("مساحة عمل جديدة");
    l.unmount();
  });
});

describe("NqWorkspaceSettings", () => {
  const workspace = { name: "Acme", slug: "acme" };
  it("saves only a changed, valid form", async () => {
    const onRename = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqWorkspaceSettings, { props: { workspace, onRename }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("workspace-settings");
    const save = () => document.body.querySelector('button[form="workspace-general"]') as HTMLButtonElement;
    expect(save().disabled).toBe(true);
    await type(w, "form input", "Acme Two");
    expect(save().disabled).toBe(false);
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onRename).toHaveBeenCalledWith({ name: "Acme Two", slug: "acme" });
    expect(w.text()).toContain("Workspace updated.");
    w.unmount();
  });

  it("is read only without edit rights, and blocks leaving for the last owner", () => {
    const w = mount(NqWorkspaceSettings, { props: { workspace, canEdit: false, canLeave: false, onLeave: vi.fn(), onDelete: vi.fn() }, attachTo: document.body });
    expect(w.text()).toContain("Only owners and admins can change these settings.");
    expect(w.text()).toContain("You are the only owner.");
    expect(w.text()).toContain("Delete this workspace");
    w.unmount();
  });

  it("hides delete without the right or the handler", () => {
    const w = mount(NqWorkspaceSettings, { props: { workspace, canDelete: false, onDelete: vi.fn() }, attachTo: document.body });
    expect(w.text()).not.toContain("Delete this workspace");
    w.unmount();
  });
});
