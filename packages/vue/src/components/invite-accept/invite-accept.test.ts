import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqInviteAccept } from ".";

const base = { workspace: { name: "Sahab Studio", meta: "12 members" }, invitedBy: { name: "Sara Alharbi" }, onAccept: async () => {} };
const find = (w: ReturnType<typeof mount>, text: string) => w.findAll("button").find((b) => b.text().includes(text))!;

describe("NqInviteAccept", () => {
  it("renders the valid state for a signed-in account", () => {
    const w = mount(NqInviteAccept, {
      props: { ...base, state: "valid", role: "Admin", inviteEmail: "omar@example.com", account: { name: "Omar Khalid", email: "omar@example.com" }, onDecline: async () => {} },
    });
    expect(w.find('[data-slot="invite-accept"]').attributes("data-state")).toBe("valid");
    expect(w.find("h1").text()).toBe("Join Sahab Studio");
    expect(w.text()).toContain("Sara Alharbi invited you to collaborate.");
    expect(w.find('[data-slot="invite-workspace"]').text()).toContain("Admin");
    expect(find(w, "Accept invitation")).toBeTruthy();
    expect(find(w, "Decline")).toBeTruthy();
  });

  it("offers sign in when signed out", async () => {
    const onSignIn = vi.fn();
    const w = mount(NqInviteAccept, { props: { ...base, state: "valid", inviteEmail: "omar@example.com", onSignIn } });
    expect(w.text()).toContain("Use omar@example.com so this invitation matches your account.".replace("omar@example.com", "⁨omar@example.com⁩"));
    await find(w, "Sign in to accept").trigger("click");
    expect(onSignIn).toHaveBeenCalled();
    expect(w.text()).not.toContain("Accept invitation");
  });

  it("shows the error an accept returns and clears the busy state", async () => {
    const onAccept = vi.fn().mockResolvedValue({ error: "Not allowed." });
    const w = mount(NqInviteAccept, { props: { ...base, state: "valid", account: { name: "O", email: "o@x.co" }, onAccept } });
    await find(w, "Accept invitation").trigger("click");
    await flushPromises();
    expect(onAccept).toHaveBeenCalled();
    expect(w.find('[role="alert"]').text()).toContain("Not allowed.");
  });

  it("handles expired: asks for a new invitation once", async () => {
    const onRequestNew = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqInviteAccept, { props: { ...base, state: "expired", onRequestNew } });
    expect(w.find("h1").text()).toBe("This invitation has expired");
    await find(w, "Ask for a new invitation").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("We told them you asked for a new invitation.");
    expect(w.findAll("button").some((b) => b.text().includes("Ask for a new invitation"))).toBe(false);
  });

  it("renders the other states and the bare frame", () => {
    for (const [state, title] of [["wrong-account", "This invitation is for another account"], ["already-accepted", "You have already joined"], ["revoked", "This invitation was cancelled"]] as const) {
      const w = mount(NqInviteAccept, { props: { ...base, state, inviteEmail: "a@b.co", account: { name: "O", email: "o@x.co" } }, attrs: {} });
      expect(w.find("h1").text()).toBe(title);
    }
    const bare = mount(NqInviteAccept, { props: { ...base, state: "revoked", bare: true } });
    expect(bare.find('[data-slot="auth-layout"]').exists()).toBe(false);
    expect(bare.find("h1").text()).toBe("This invitation was cancelled");
  });
});
