import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqSelect } from "../select";
import { NqInviteMembersDialog, NqMembersManager, membersAttempt, type MemberRoleOption, type PendingInvite, type TeamMember } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const roles: MemberRoleOption[] = [
  { id: "owner", label: "Owner" },
  { id: "admin", label: "Admin" },
  { id: "member", label: "Member", description: "Works here" },
];
const members: TeamMember[] = [
  { id: "m1", name: "Sara Alharbi", email: "sara@acme.test", role: "owner", joinedAt: "2025-01-12", lastActive: "2026-09-28T10:00:00Z" },
  { id: "m2", name: "Omar Nasser", email: "omar@acme.test", role: "admin", joinedAt: "2025-05-03" },
  { id: "m3", name: "Lina Haddad", email: "lina@acme.test", role: "member", joinedAt: "2026-03-20" },
];
const invites: PendingInvite[] = [{ id: "i1", email: "new@acme.test", role: "member", invitedBy: "Sara", sentAt: "2026-09-27T09:00:00Z", expiresAt: "2026-01-01" }];
const menu = () => [...document.body.querySelectorAll('[role="menuitem"]')] as HTMLElement[];

describe("membersAttempt", () => {
  it("returns null, the error text, or an empty string on a throw", async () => {
    expect(await membersAttempt(() => undefined)).toBeNull();
    expect(await membersAttempt(() => ({ error: "No" }))).toBe("No");
    expect(await membersAttempt(() => Promise.reject(new Error("x")))).toBe("");
  });
});

describe("NqMembersManager", () => {
  it("renders members with the You badge and a locked owner role", () => {
    const w = mount(NqMembersManager, { props: { members, roles, currentUserId: "m1", onChangeRole: vi.fn() }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("members-manager");
    expect(w.text()).toContain("Sara Alharbi");
    expect(w.text()).toContain("You");
    expect(w.text()).toContain("Never");
    expect(w.findAllComponents(NqSelect)).toHaveLength(2);
    w.unmount();
  });

  it("changes a role from the inline select", async () => {
    const onChangeRole = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqMembersManager, { props: { members, roles, currentUserId: "m1", onChangeRole }, attachTo: document.body });
    w.findAllComponents(NqSelect)[1]!.vm.$emit("update:modelValue", "admin");
    await flushPromises();
    expect(onChangeRole).toHaveBeenCalledWith(expect.objectContaining({ id: "m3" }), "admin");
    expect(w.text()).toContain("Role updated for Lina Haddad.");
    w.unmount();
  });

  it("shows the pending tab only with invites and lets you revoke", async () => {
    const without = mount(NqMembersManager, { props: { members, roles }, attachTo: document.body });
    expect(without.text()).not.toContain("Pending invites");
    without.unmount();
    const onRevokeInvite = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqMembersManager, { props: { members, roles, invites, onRevokeInvite }, attachTo: document.body });
    expect(w.text()).toContain("Pending invites");
    await w.findAll('[role="tab"]')[1]!.trigger("mousedown", { button: 0 });
    await flushPromises();
    expect(w.text()).toContain("new@acme.test");
    expect(w.text()).toContain("Expired");
    await w.findAll("button").find((b) => b.text().includes("Revoke"))!.trigger("click");
    await flushPromises();
    expect(onRevokeInvite).toHaveBeenCalledWith(invites[0]);
    expect(w.text()).toContain("Invite to new@acme.test was revoked.");
    w.unmount();
  });

  it("asks before removing and reports a failure", async () => {
    const onRemove = vi.fn().mockResolvedValue({ error: "Nope" });
    const w = mount(NqMembersManager, { props: { members, roles, currentUserId: "m1", onRemove }, attachTo: document.body });
    await w.findAll("tbody tr").find((r) => r.text().includes("Lina"))!.trigger("contextmenu");
    await flushPromises();
    menu().find((i) => i.textContent?.includes("Remove from workspace"))!.click();
    await flushPromises();
    expect(document.body.textContent).toContain("Remove Lina Haddad?");
    [...document.body.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Remove member")!.click();
    await flushPromises();
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: "m3" }));
    expect(document.body.textContent).toContain("Nope");
    w.unmount();
  });

  it("blocks the last owner from leaving and offers transfer to an owner", async () => {
    const w = mount(NqMembersManager, { props: { members, roles, currentUserId: "m1", onLeave: vi.fn(), onTransferOwnership: vi.fn() }, attachTo: document.body });
    const leave = w.find('[data-slot="members-leave"] button');
    expect((leave.element as HTMLButtonElement).disabled).toBe(true);
    expect(w.text()).toContain("only owner");
    await w.findAll("tbody tr").find((r) => r.text().includes("Omar"))!.trigger("contextmenu");
    await flushPromises();
    expect(menu().some((i) => i.textContent?.includes("Transfer ownership"))).toBe(true);
    w.unmount();
  });

  it("speaks Arabic under an Arabic provider", () => {
    const w = mount(
      { components: { NqMembersManager, NasaqProvider }, setup: () => ({ members, roles }), template: `<NasaqProvider locale="ar"><NqMembersManager :members="members" :roles="roles" /></NasaqProvider>` },
      { attachTo: document.body },
    );
    expect(w.text()).toContain("الأعضاء");
    w.unmount();
  });
});

describe("NqInviteMembersDialog", () => {
  it("requires an email, then submits emails and role", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqInviteMembersDialog, { props: { open: true, roles: roles.slice(1), onSubmit }, attachTo: document.body });
    await flushPromises();
    const form = document.body.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(document.body.textContent).toContain("Add at least one email address.");
    const input = document.body.querySelector("form input") as HTMLInputElement;
    input.value = "a@b.test";
    input.dispatchEvent(new Event("input"));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flushPromises();
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith({ emails: ["a@b.test"], role: "member" });
    w.unmount();
  });
});
