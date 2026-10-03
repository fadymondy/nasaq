import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqSelect } from "../select";
import { grantCounts, levelOf, NqAccessGrants, setLevel, type ConnectedApp } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const apps: ConnectedApp[] = [
  { id: "a1", name: "Notion Sync", kind: "app", publisher: "Acme Labs", orgId: "o1", scopes: ["docs:read", "users:read"], authorizedAt: "2026-08-01", lastUsedAt: null },
  { id: "g1", name: "Support Agent", kind: "agent", orgId: "o2", scopes: ["docs:read", "docs:write", "billing:read", "users:read", "x:y"], authorizedAt: "2026-09-01", lastUsedAt: "2026-09-28T10:00:00Z" },
];
const resources = [
  { id: "docs", label: "Documents" },
  { id: "billing", label: "Billing" },
];
const orgs = [
  { id: "o1", name: "Acme" },
  { id: "o2", name: "Globex" },
];

describe("access rules", () => {
  it("reads, sets and counts levels", () => {
    const g = setLevel({}, "g1", "docs", "write");
    expect(levelOf(g, "g1", "docs")).toBe("write");
    expect(levelOf(g, "g1", "billing")).toBe("none");
    expect(grantCounts(setLevel(g, "g1", "billing", "read"), "g1", ["docs", "billing"])).toEqual({ read: 2, write: 1 });
  });
});

describe("NqAccessGrants", () => {
  it("lists apps with scopes, kind and read-only badges", () => {
    const w = mount(NqAccessGrants, { props: { apps, organizations: orgs, scopeLabels: { "docs:read": "Read documents" } } });
    expect(w.attributes("data-slot")).toBe("access-grants");
    const rows = w.findAll('[data-slot="access-apps"] > li');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain("Read documents");
    expect(rows[0]!.text()).toContain("Read only");
    expect(rows[0]!.text()).toContain("Acme Labs · Acme");
    expect(rows[0]!.text()).toContain("Never used");
    expect(rows[1]!.text()).toContain("+2 more");
    expect(rows[1]!.text()).toContain("Agent");
  });

  it("shows the empty state", () => {
    const w = mount(NqAccessGrants, { props: { apps: [] } });
    expect(w.text()).toContain("No apps or agents yet");
  });

  it("revokes after confirming and shows a notice", async () => {
    const onRevoke = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqAccessGrants, { props: { apps, onRevoke }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text().includes("Revoke"))!.trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("Revoke Notion Sync?");
    const confirm = [...document.body.querySelectorAll("[role=alertdialog] button")].find((b) => b.textContent?.trim() === "Revoke") as HTMLElement;
    confirm.click();
    await flushPromises();
    expect(onRevoke).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }));
    expect(w.text()).toContain("Notion Sync was revoked.");
    w.unmount();
  });

  it("builds the matrix for agents only, with a summary", () => {
    const w = mount(NqAccessGrants, { props: { apps, resources, grants: { g1: { docs: "write", billing: "read" } }, onChangeGrant: vi.fn() } });
    const table = w.get('[data-slot="access-matrix"]');
    expect(table.findAll("tbody tr")).toHaveLength(1);
    expect(table.text()).toContain("Reads 2, writes 1");
    expect(table.findAll("[data-level]").map((c) => c.attributes("data-level"))).toEqual(["write", "read"]);
  });

  it("changes a cell at once and rolls it back when the host fails", async () => {
    const onChangeGrant = vi.fn().mockResolvedValue({ error: "Nope" });
    const w = mount(NqAccessGrants, { props: { apps, resources, grants: { g1: { docs: "read" } }, onChangeGrant } });
    w.findAllComponents(NqSelect)[0]!.vm.$emit("update:modelValue", "write");
    await flushPromises();
    expect(onChangeGrant).toHaveBeenCalledWith("g1", "docs", "write");
    expect(w.text()).toContain("Nope");
    expect(w.findAll("[data-level]")[0]!.attributes("data-level")).toBe("read");
  });

  it("keeps a change that saved", async () => {
    const onChangeGrant = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqAccessGrants, { props: { apps, resources, grants: {}, onChangeGrant } });
    w.findAllComponents(NqSelect)[0]!.vm.$emit("update:modelValue", "write");
    await flushPromises();
    expect(w.findAll("[data-level]")[0]!.attributes("data-level")).toBe("write");
    expect(w.find('[data-slot="alert"]').exists()).toBe(false);
  });

  it("hides sections that are not asked for", () => {
    const w = mount(NqAccessGrants, { props: { apps, resources, sections: ["grants"] } });
    expect(w.find('[data-slot="access-apps"]').exists()).toBe(false);
    expect(w.find('[data-slot="access-matrix"]').exists()).toBe(true);
  });

  it("speaks Arabic under an Arabic provider", () => {
    const w = mount(
      { components: { NqAccessGrants, NasaqProvider }, setup: () => ({ apps }), template: `<NasaqProvider locale="ar"><NqAccessGrants :apps="apps" /></NasaqProvider>` },
      { attachTo: document.body },
    );
    expect(w.text()).toContain("التطبيقات والوكلاء المصرّح لهم");
    w.unmount();
  });
});
