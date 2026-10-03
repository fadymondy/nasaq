import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqAttention, type AttentionItem } from ".";

const items: AttentionItem[] = [
  { id: "a", tone: "info", title: "Info row" },
  { id: "b", tone: "danger", title: "Danger row", href: "/d", time: "12m", dateTime: "2026-01-01T10:00:00Z", action: { label: "Retry", onClick: () => {} } },
  { id: "c", tone: "warning", title: "Warning row", onSelect: () => {}, count: 4 },
];

const titles = (w: ReturnType<typeof mount>) => w.findAll('[data-slot="attention-item"]').map((r) => r.find("a,button,span.truncate").text());

describe("NqAttention", () => {
  it("renders nothing when empty, unless an empty line is given", () => {
    expect(mount(NqAttention, { props: { items: [] } }).find('[data-slot="attention"]').exists()).toBe(false);
    const w = mount(NqAttention, { props: { items: [], empty: "All clear" } });
    expect(w.text()).toContain("All clear");
  });

  it("sorts by tone, shows the count and labels the section", () => {
    const w = mount(NqAttention, { props: { items } });
    expect(titles(w)).toEqual(["Danger row", "Warning row", "Info row"]);
    expect(w.find('[data-slot="attention-count"]').text()).toBe("3");
    const heading = w.find("h2");
    expect(heading.text()).toBe("Needs your attention");
    expect(w.find("section").attributes("aria-labelledby")).toBe(heading.attributes("id"));
    expect(w.findAll('[data-slot="attention-item"]')[0]!.attributes("data-tone")).toBe("danger");
    expect(w.find('[data-slot="attention-item-count"]').text()).toBe("4");
    expect(w.find("time").attributes("datetime")).toBe("2026-01-01T10:00:00Z");
  });

  it("makes titles links or buttons, and wires action and dismiss", async () => {
    const onClick = vi.fn();
    const onSelect = vi.fn();
    const onDismiss = vi.fn();
    const w = mount(NqAttention, {
      props: { items: [{ id: "x", tone: "danger", title: "Fix", onSelect, onDismiss, action: { label: "Retry", onClick } }] },
    });
    const row = w.find('[data-slot="attention-item"]');
    await row.findAll("button").find((b) => b.text() === "Fix")!.trigger("click");
    await row.findAll("button").find((b) => b.text() === "Retry")!.trigger("click");
    await row.find('[aria-label="Dismiss"]').trigger("click");
    expect(onSelect).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });

  it("trims to max and expands in place", async () => {
    const many = Array.from({ length: 4 }, (_, i) => ({ id: `i${i}`, title: `Row ${i}` }));
    const w = mount(NqAttention, { props: { items: many, max: 2 } });
    expect(w.findAll('[data-slot="attention-item"]')).toHaveLength(2);
    const more = w.find("button[aria-expanded]");
    expect(more.text()).toBe("Show 2 more");
    await more.trigger("click");
    expect(w.findAll('[data-slot="attention-item"]')).toHaveLength(4);
    expect(more.text()).toBe("Show less");
  });

  it("checklists keep order, put done rows last and show progress", () => {
    const w = mount(NqAttention, {
      props: { items: [{ id: "1", title: "Done step", done: true }, { id: "2", title: "Next step", done: false }] },
    });
    expect(titles(w)).toEqual(["Next step", "Done step"]);
    expect(w.text()).toContain("1 of 2 done");
    expect(w.find('[data-slot="attention-count"]').exists()).toBe(false);
  });

  it("view all: a link replaces the expander; loading shows placeholders", () => {
    const w = mount(NqAttention, { props: { items, max: 1, viewAllHref: "/inbox" } });
    expect(w.find('a[href="/inbox"]').text()).toBe("View all");
    expect(w.find("button[aria-expanded]").exists()).toBe(false);
    const l = mount(NqAttention, { props: { items: [], loading: true } });
    expect(l.find("section").attributes("aria-busy")).toBe("true");
    expect(l.text()).toContain("Loading…");
  });
});
