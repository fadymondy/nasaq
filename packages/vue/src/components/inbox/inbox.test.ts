import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqInbox, NqThreadSearchBar, countViews, filterConversations, findMatches, type InboxConversation } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

const at = (h: number) => new Date(2026, 8, 29, h).getTime();
const agents = [{ id: "a1", name: "Sara Ali" }, { id: "a2", name: "Omar Nasser" }];
function make(): InboxConversation[] {
  return [
    { id: "c1", channel: "chat", status: "open", unread: 2, contact: { id: "u1", name: "Layla Hassan", email: "layla@example.com" }, messages: [{ id: "m1", direction: "in", kind: "text", body: "Where is my order?", at: at(8) }] },
    { id: "c2", channel: "email", status: "open", subject: "Invoice", contact: { id: "u2", name: "Karim Adel", email: "karim@example.com" }, messages: [{ id: "m2", direction: "in", kind: "text", body: "Need an invoice", at: at(7) }] },
    { id: "c3", channel: "whatsapp", status: "closed", contact: { id: "u3", name: "Nour Samir" }, messages: [{ id: "m3", direction: "in", kind: "text", body: "Thanks", at: at(6) }] },
  ] as unknown as InboxConversation[];
}
const base = () => ({ conversations: make(), agents, currentAgentId: "a1", onSend: vi.fn(async () => undefined), onUpdate: vi.fn() });

describe("inbox helpers", () => {
  it("filters by view and counts", () => {
    const list = make();
    expect(filterConversations(list, { channel: "all", scope: "all", query: "", me: "a1", view: "active" }).map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(countViews(list).closed).toBe(1);
    expect(findMatches(list[0]!.messages, "order")).toHaveLength(1);
  });
});

describe("NqInbox", () => {
  it("lists active conversations with view tabs and an unread count", () => {
    const w = mount(NqInbox, { props: base(), attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("inbox");
    expect(w.text()).toContain("Layla Hassan");
    expect(w.text()).toContain("Karim Adel");
    expect(w.text()).not.toContain("Nour Samir");
    expect(w.findAll('[data-slot="tabs-tab"]').length).toBe(5);
  });
  it("opens a conversation, marks it read and shows the composer", async () => {
    const props = base();
    const w = mount(NqInbox, { props, attachTo: document.body });
    const row = w.findAll("button").find((b) => b.text().includes("Layla Hassan"))!;
    await row.trigger("click");
    await flushPromises();
    expect(props.onUpdate).toHaveBeenCalledWith("c1", { unread: false });
    expect(w.find('[data-slot="inbox-composer"]').exists()).toBe(true);
    expect(w.find('[data-slot="inbox-message"]').exists()).toBe(true);
  });
  it("sends a reply through onSend", async () => {
    const props = base();
    const w = mount(NqInbox, { props: { ...props, defaultSelectedId: "c1" }, attachTo: document.body });
    await w.find("textarea").setValue("On its way");
    await w.find('button[aria-label="Send"]').trigger("click");
    await flushPromises();
    expect(props.onSend).toHaveBeenCalledTimes(1);
    const draft = (props.onSend.mock.calls[0] as unknown as [{ body: string; mode: string; conversationId: string }])[0];
    expect(draft).toMatchObject({ body: "On its way", mode: "reply", conversationId: "c1" });
  });
  it("filters the list by the search field", async () => {
    const w = mount(NqInbox, { props: base(), attachTo: document.body });
    await w.find('input[type="search"]').setValue("karim");
    expect(w.text()).toContain("Karim Adel");
    expect(w.text()).not.toContain("Layla Hassan");
  });
  it("shows the email fields for an email conversation", () => {
    const w = mount(NqInbox, { props: { ...base(), defaultSelectedId: "c2" }, attachTo: document.body });
    expect(w.find('[data-slot="inbox-composer"]').text()).toContain("karim@example.com");
  });
});

describe("NqThreadSearchBar", () => {
  it("steps through matches and closes", async () => {
    const onIndexChange = vi.fn();
    const onClose = vi.fn();
    const w = mount(NqThreadSearchBar, { props: { total: 3, index: 0, onIndexChange, onClose, query: "a" }, attachTo: document.body });
    await w.find("input").trigger("keydown", { key: "Enter" });
    expect(onIndexChange).toHaveBeenCalledWith(1);
    await w.find("input").trigger("keydown", { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
