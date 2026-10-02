import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildThread, linkMentions, NqCommentThread, type ThreadComment } from ".";
import { NasaqProvider } from "../../provider";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

const me = { id: "u1", name: "Sara Ali" };
const other = { id: "u2", name: "Omar Nasser", kind: "agent" as const };
const at = (n: number) => new Date(2026, 8, 29, 9, n).toISOString();
const base: ThreadComment[] = [
  { id: "c2", author: other, body: "Reply here", createdAt: at(5), parentId: "c1" },
  { id: "c1", author: me, body: "Hello @Omar Nasser", createdAt: at(1), mentions: [{ id: "u2", name: "Omar Nasser" }] },
  { id: "c3", author: other, body: "Needs review", createdAt: at(9), pending: true },
];

describe("comment-thread logic", () => {
  it("nests a reply under its root, oldest first", () => {
    const t = buildThread(base);
    expect(t.map((n) => n.comment.id)).toEqual(["c1", "c3"]);
    expect(t[0]!.replies.map((r) => r.id)).toEqual(["c2"]);
  });
  it("links mentions", () => {
    expect(linkMentions("Hi @Omar Nasser", [{ id: "u2", name: "Omar Nasser" }])).toBe("Hi [@Omar Nasser](#mention-u2)");
  });
});

describe("NqCommentThread", () => {
  it("renders threads, badges, the count and the pending state", () => {
    const w = mount(NqCommentThread, { props: { comments: base, currentUser: me, onSubmit: vi.fn() } });
    expect(w.attributes("data-slot")).toBe("comment-thread");
    expect(w.findAll('[data-slot="comment"]').length).toBe(3);
    expect(w.find('[data-slot="comment"][data-pending]').text()).toContain("Awaiting review");
    expect(w.text()).toContain("Agent");
    expect(w.find("h3").text()).toContain("3");
    expect(w.find('[data-slot="comment-body"] a[href="#mention-u2"]').exists()).toBe(true);
  });

  it("shows the empty state", () => {
    const w = mount(NqCommentThread, { props: { comments: [] } });
    expect(w.text()).toContain("No comments yet");
  });

  it("posts a comment and clears the box", async () => {
    const onSubmit = vi.fn(async () => undefined);
    const w = mount(NqCommentThread, { props: { comments: [], currentUser: me, onSubmit }, attachTo: document.body });
    const area = w.find("textarea");
    await area.setValue("  Great work  ");
    await w.find('form[data-slot="comment-composer"]').trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith({ body: "Great work", mentions: [] });
    expect((w.find("textarea").element as HTMLTextAreaElement).value).toBe("");
  });

  it("keeps the text and shows the error when posting fails", async () => {
    const onSubmit = vi.fn(async () => ({ error: "Rate limited" }));
    const w = mount(NqCommentThread, { props: { comments: [], currentUser: me, onSubmit }, attachTo: document.body });
    await w.find("textarea").setValue("hello");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toBe("Rate limited");
    expect((w.find("textarea").element as HTMLTextAreaElement).value).toBe("hello");
  });

  it("opens a reply composer under the thread and posts with parentId", async () => {
    const onSubmit = vi.fn(async () => undefined);
    const w = mount(NqCommentThread, { props: { comments: base, currentUser: me, onSubmit }, attachTo: document.body });
    const replyBtn = w.findAll("button").find((b) => b.text() === "Reply")!;
    await replyBtn.trigger("click");
    const forms = w.findAll('form[data-slot="comment-composer"]');
    expect(forms.length).toBe(2);
    await forms[0]!.find("textarea").setValue("Thanks");
    await forms[0]!.trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith({ body: "Thanks", mentions: [], parentId: "c1" });
  });

  it("confirms before deleting", async () => {
    const onDelete = vi.fn(async () => undefined);
    const w = mount(NqCommentThread, { props: { comments: [base[1]!], currentUser: me, onDelete }, attachTo: document.body });
    // The "…" menu is a dropdown; the context menu offers the same actions. Open via the dropdown trigger.
    await w.find('button[aria-label="Actions for the comment by Sara Ali"]').trigger("click");
    await flushPromises();
    const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((i) => i.textContent?.includes("Delete"))!;
    item.click();
    await flushPromises();
    expect(w.find('[role="alertdialog"]').exists()).toBe(true);
    expect(onDelete).not.toHaveBeenCalled();
    await w.find('[role="alertdialog"] button').trigger("click");
    await flushPromises();
    expect(onDelete).toHaveBeenCalledWith("c1");
  });

  it("shows a sign-in prompt when signed out", async () => {
    const onSignIn = vi.fn();
    const w = mount(NqCommentThread, { props: { comments: [], signedIn: false, onSubmit: vi.fn(), onSignIn } });
    expect(w.find("textarea").exists()).toBe(false);
    await w.find('[data-slot="comment-signin"] button').trigger("click");
    expect(onSignIn).toHaveBeenCalled();
  });

  it("speaks Arabic", () => {
    const a = mount({ components: { NasaqProvider, NqCommentThread }, template: `<NasaqProvider locale="ar"><NqCommentThread :comments="[]" /></NasaqProvider>` });
    expect(a.text()).toContain("لا توجد تعليقات بعد");
  });
});
