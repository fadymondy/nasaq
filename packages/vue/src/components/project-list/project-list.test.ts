import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqProjectList, type Project } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const projects: Project[] = [
  { id: "1", name: "Website redesign", key: "WEB", client: "Acme", status: "active", progress: 62, dueDate: "2020-01-01", members: [{ name: "Sara Ali" }, { name: "Omar Nasser" }], lastActivity: "2026-09-28T09:00:00Z" },
  { id: "2", name: "Billing", status: "completed", progress: 100, dueDate: "2020-01-01", lastActivity: "2026-09-01T09:00:00Z" },
];
const names = (w: ReturnType<typeof mount>) => w.findAll("tbody tr[data-row]").map((r) => r.findAll("td")[1]!.text());

describe("NqProjectList", () => {
  it("sorts by last activity and shows key, client, status and progress", () => {
    const w = mount(NqProjectList, { props: { projects }, attachTo: document.body });
    expect(names(w)[0]).toContain("Website redesign");
    expect(w.text()).toContain("WEB");
    expect(w.text()).toContain("Active");
    expect(w.text()).toContain("62%");
    expect(w.findAll("[role=progressbar]")).toHaveLength(2);
  });

  it("marks an unfinished project past its due date as overdue, but not a completed one", () => {
    const w = mount(NqProjectList, { props: { projects }, attachTo: document.body });
    expect(w.findAll("tbody tr[data-row]")[0]!.text()).toContain("Overdue");
    expect(w.findAll("tbody tr[data-row]")[1]!.text()).not.toContain("Overdue");
  });

  it("searches by client and renders cards", async () => {
    const w = mount(NqProjectList, { props: { projects, defaultView: "cards" }, attachTo: document.body });
    expect(w.findAll("[data-card]")).toHaveLength(2);
    await w.find("input[type=search]").setValue("acme");
    expect(w.findAll("[data-card]")).toHaveLength(1);
  });

  it("shows the empty state and speaks Arabic", () => {
    expect(mount(NqProjectList, { props: { projects: [] }, attachTo: document.body }).text()).toContain("No projects yet");
    const ar = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqProjectList, { projects })) }, { attachTo: document.body });
    expect(ar.text()).toContain("نشط");
  });
});
