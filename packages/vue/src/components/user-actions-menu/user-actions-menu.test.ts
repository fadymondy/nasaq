import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqUserActionsMenu } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const user = { name: "Mona", email: "mona@example.com", roles: ["editor"] };
const q = (sel: string) => document.querySelector<HTMLElement>(sel);

describe("NqUserActionsMenu", () => {
  it("toolbar shows only actions with handlers", () => {
    const w = mount(NqUserActionsMenu, { props: { user, variant: "toolbar", onEdit: vi.fn(), onDelete: vi.fn() } });
    expect(w.attributes("data-slot")).toBe("user-actions-menu");
    expect(w.attributes("data-variant")).toBe("toolbar");
    expect(w.findAll("[data-action]").map((b) => b.attributes("data-action"))).toEqual(["edit", "delete"]);
    expect(w.find('[data-action="delete"]').classes()).toContain("text-nq-danger-text");
  });

  it("menu variant renders a labelled trigger", () => {
    const w = mount(NqUserActionsMenu, { props: { user, onEdit: vi.fn() } });
    expect(w.attributes("data-variant")).toBe("menu");
    expect(w.find("button").attributes("aria-label")).toBe("Actions for Mona");
  });

  it("confirms delete, then calls the handler", async () => {
    const onDelete = vi.fn(async () => undefined);
    const w = mount(NqUserActionsMenu, { props: { user, variant: "toolbar", onDelete }, attachTo: document.body });
    await w.find('[data-action="delete"]').trigger("click");
    await flushPromises();
    expect(onDelete).not.toHaveBeenCalled();
    const confirm = [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("Delete user"))!;
    confirm.click();
    await flushPromises();
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("keeps the dialog open and shows a server error", async () => {
    const onDelete = vi.fn(async () => ({ error: "Not allowed" }));
    const w = mount(NqUserActionsMenu, { props: { user, variant: "toolbar", onDelete }, attachTo: document.body });
    await w.find('[data-action="delete"]').trigger("click");
    await flushPromises();
    [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("Delete user"))!.click();
    await flushPromises();
    expect(document.body.textContent).toContain("Not allowed");
  });

  it("validates the email before editing", async () => {
    const onEdit = vi.fn(async () => undefined);
    const w = mount(NqUserActionsMenu, { props: { user, variant: "toolbar", onEdit }, attachTo: document.body });
    await w.find('[data-action="edit"]').trigger("click");
    await flushPromises();
    const input = q('input[type="email"]') as HTMLInputElement;
    input.value = "nope";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    q("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();
    expect(onEdit).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Enter a valid email address.");
  });

  it("shows a copyable link from the magic-link action", async () => {
    const onSendMagicLink = vi.fn(async () => ({ link: "https://x.test/l/1" }));
    const w = mount(NqUserActionsMenu, { props: { user, variant: "toolbar", onSendMagicLink }, attachTo: document.body });
    await w.find('[data-action="magic-link"]').trigger("click");
    await flushPromises();
    expect(onSendMagicLink).toHaveBeenCalled();
    expect((q('input[readonly], [data-slot="copy-field"] input') as HTMLInputElement).value).toBe("https://x.test/l/1");
  });
});
