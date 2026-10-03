import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { h } from "vue";
import { NqApiReference, NqApiToolCatalog, NqApiToolDetail, type ApiTool } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const tools: ApiTool[] = [
  {
    id: "create_issue",
    name: "create_issue",
    summary: "Create an issue.",
    category: "Issues",
    scope: "issues:write",
    minRole: "Member",
    access: "write",
    args: [{ name: "title", type: "string", required: true, description: "Short title." }],
    examples: [{ call: '{ "title": "x" }', result: '{ "id": 1 }' }],
  },
  { id: "list_issues", name: "list_issues", summary: "List issues.", category: "Issues", scope: "issues:read", minRole: "Viewer" },
  { id: "drop_db", name: "drop_db", summary: "Drop it.", category: "Admin", scope: "admin", minRole: "Owner", access: "destructive" },
];

describe("NqApiToolDetail", () => {
  it("renders name, scope and args", () => {
    const w = mount(NqApiToolDetail, { props: { tool: tools[0]! }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("api-tool");
    expect(w.text()).toContain("create_issue");
    expect(w.text()).toContain("issues:write");
    expect(w.text()).toContain("Short title.");
  });
});

describe("NqApiToolCatalog", () => {
  it("renders a card per tool and emits select", async () => {
    const w = mount(NqApiToolCatalog, { props: { tools } });
    expect(w.attributes("data-slot")).toBe("api-tool-catalog");
    expect(w.findAll("article")).toHaveLength(3);
    await w.find('[data-tool="drop_db"] button').trigger("click");
    expect(w.emitted("select")![0]![0]).toMatchObject({ id: "drop_db" });
  });
});

describe("NqApiReference", () => {
  it("shows the first tool, switches selection and filters", async () => {
    const w = mount(NqApiReference, { props: { tools }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("api-reference");
    expect(w.attributes("data-view")).toBe("reference");
    expect(w.find('[data-slot="api-tool"]').text()).toContain("create_issue");
    const navButtons = w.findAll("nav button[aria-current], nav ul button");
    expect(navButtons.length).toBeGreaterThanOrEqual(3);
    await w.findAll("nav ul button")[1]!.trigger("click");
    expect(w.emitted("update:selectedId")![0]).toEqual(["list_issues"]);
    expect(w.find('[data-slot="api-tool"]').text()).toContain("list_issues");
    await w.find('input[type="search"]').setValue("drop");
    expect(w.findAll("nav ul button")).toHaveLength(1);
    await w.find('input[type="search"]').setValue("zzz");
    expect(w.find('[data-slot="empty-state"]').exists()).toBe(true);
  });

  it("switches to the catalog view", async () => {
    const w = mount(NqApiReference, { props: { tools, defaultView: "catalog" }, attachTo: document.body });
    expect(w.attributes("data-view")).toBe("catalog");
    expect(w.findAll("article[data-tool]")).toHaveLength(3);
    await w.find('[data-tool="drop_db"] button').trigger("click");
    expect(w.attributes("data-view")).toBe("reference");
    expect(w.find('[data-slot="api-tool"]').text()).toContain("drop_db");
  });

  it("renders Arabic", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqApiReference, { tools })) }, { attachTo: document.body });
    expect(w.text()).toContain("أداة");
  });
});
