import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqAddUserDialog, NqAdminUsers, NqUserRolesDialog, adminUsersAttempt, type ManagedRole, type ManagedUser } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const roles: ManagedRole[] = [
  { id: "admin", label: "Admin" },
  { id: "editor", label: "Editor", description: "Can edit" },
];
const users: ManagedUser[] = [
  { id: "u1", name: "Sara Alharbi", email: "sara@acme.test", roles: ["admin"], status: "active", verified: true, lastActive: "2026-09-28T10:00:00Z", createdAt: "2026-01-12" },
  { id: "u2", name: "Omar Nasser", email: "omar@acme.test", roles: ["editor"], status: "active", verified: false, lastActive: null, createdAt: "2026-05-03" },
  { id: "u3", name: "Lina Haddad", email: "lina@acme.test", roles: [], status: "disabled", verified: true, createdAt: "2026-03-20" },
];
const menu = () => [...document.body.querySelectorAll('[role="menuitem"]')] as HTMLElement[];

describe("adminUsersAttempt", () => {
  it("returns null, the error text, or an empty string on a throw", async () => {
    expect(await adminUsersAttempt(() => undefined)).toBeNull();
    expect(await adminUsersAttempt(() => ({ error: "No" }))).toBe("No");
    expect(await adminUsersAttempt(() => Promise.reject(new Error("x")))).toBe("");
  });
});

describe("NqAdminUsers", () => {
  it("renders stats and rows with roles, status and the You badge", () => {
    const w = mount(NqAdminUsers, { props: { users, roles, currentUserId: "u1" }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("admin-users");
    expect(w.findAll('[data-slot="stat-card"]')).toHaveLength(4);
    expect(w.text()).toContain("Sara Alharbi");
    expect(w.text()).toContain("You");
    expect(w.text()).toContain("No roles");
    expect(w.text()).toContain("Never");
    w.unmount();
  });

  it("shows the empty state with an add button", () => {
    const w = mount(NqAdminUsers, { props: { users: [], roles, hideStats: true, onAddUser: vi.fn() }, attachTo: document.body });
    expect(w.text()).toContain("No users yet");
    expect(w.findAll("button").some((b) => b.text().includes("Add user"))).toBe(true);
    w.unmount();
  });

  it("verifies a user from the row menu and shows the notice", async () => {
    const onVerify = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqAdminUsers, { props: { users, roles, onVerify }, attachTo: document.body });
    await w.findAll("tbody tr").find((r) => r.text().includes("Omar"))!.trigger("contextmenu");
    await flushPromises();
    menu().find((i) => i.textContent?.includes("Verify email"))!.click();
    await flushPromises();
    expect(onVerify).toHaveBeenCalledWith(expect.objectContaining({ id: "u2" }));
    expect(w.text()).toContain("Omar Nasser was verified.");
    w.unmount();
  });

  it("asks before disabling and reports a failure", async () => {
    const onSetDisabled = vi.fn().mockResolvedValue({ error: "Last admin" });
    const w = mount(NqAdminUsers, { props: { users, roles, onSetDisabled, currentUserId: "u1" }, attachTo: document.body });
    await w.findAll("tbody tr").find((r) => r.text().includes("Omar"))!.trigger("contextmenu");
    await flushPromises();
    menu().find((i) => i.textContent?.includes("Disable account"))!.click();
    await flushPromises();
    expect(document.body.textContent).toContain("Disable Omar Nasser?");
    expect(onSetDisabled).not.toHaveBeenCalled();
    const confirm = [...document.body.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Disable account")!;
    confirm.click();
    await flushPromises();
    expect(onSetDisabled).toHaveBeenCalledWith(expect.objectContaining({ id: "u2" }), true);
    expect(document.body.textContent).toContain("Last admin");
    w.unmount();
  });

  it("speaks Arabic under an Arabic provider", () => {
    const w = mount(
      { components: { NqAdminUsers, NasaqProvider }, setup: () => ({ users, roles }), template: `<NasaqProvider locale="ar"><NqAdminUsers :users="users" :roles="roles" /></NasaqProvider>` },
      { attachTo: document.body },
    );
    expect(w.text()).toContain("إجمالي المستخدمين");
    w.unmount();
  });
});

describe("NqAddUserDialog", () => {
  it("validates, then submits trimmed values", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqAddUserDialog, { props: { open: true, roles, onSubmit }, attachTo: document.body });
    await flushPromises();
    const form = document.body.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(document.body.textContent).toContain("Enter a name.");
    expect(document.body.textContent).toContain("Enter an email address.");
    const [name, email] = [...document.body.querySelectorAll("form input")] as HTMLInputElement[];
    name!.value = " Mona ";
    name!.dispatchEvent(new Event("input"));
    email!.value = "mona@x.test";
    email!.dispatchEvent(new Event("input"));
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Mona", email: "mona@x.test", roles: ["admin"], sendInvite: true, verified: false }));
    w.unmount();
  });

  it("keeps the dialog open with field errors from the host", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ fieldErrors: { email: "Already taken" } });
    const w = mount(NqAddUserDialog, { props: { open: true, roles, onSubmit }, attachTo: document.body });
    await flushPromises();
    const [name, email] = [...document.body.querySelectorAll("form input")] as HTMLInputElement[];
    name!.value = "Mona";
    name!.dispatchEvent(new Event("input"));
    email!.value = "mona@x.test";
    email!.dispatchEvent(new Event("input"));
    document.body.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(document.body.textContent).toContain("Already taken");
    expect(w.emitted("update:open")).toBeUndefined();
    w.unmount();
  });
});

describe("NqUserRolesDialog", () => {
  it("enables Save only after a change and saves the chosen roles", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqUserRolesDialog, { props: { user: users[1]!, roles, onSave }, attachTo: document.body });
    await flushPromises();
    expect(document.body.textContent).toContain("Roles for Omar Nasser");
    const save = [...document.body.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Save roles") as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    (document.body.querySelector('[role="checkbox"]') as HTMLElement).click();
    await flushPromises();
    expect(save.disabled).toBe(false);
    save.click();
    await flushPromises();
    expect(onSave).toHaveBeenCalledWith(users[1], expect.arrayContaining(["editor", "admin"]));
    w.unmount();
  });
});
