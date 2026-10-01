import { mount } from "@vue/test-utils";
import { Clock } from "lucide-vue-next";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqGlanceRow, NqTrayPopover, NqWatchGlance, NqWidgetGallery, NqWidgetTile } from ".";

describe("NqGlanceRow", () => {
  it("renders icon, label, detail and a toned value", () => {
    const w = mount(NqGlanceRow, { props: { icon: Clock, label: "Timer", detail: "Since 9:00", value: "00:42", tone: "info" } });
    expect(w.attributes("data-slot")).toBe("glance-row");
    expect(w.classes()).toEqual(expect.arrayContaining(["flex", "px-3", "py-2"]));
    expect(w.find("svg").classes()).toEqual(expect.arrayContaining(["size-[18px]", "text-nq-info-text"]));
    expect(w.text()).toContain("Since 9:00");
    expect(w.find(".tabular-nums").classes()).toContain("text-nq-info-text");
    expect(w.find("button").exists()).toBe(false);
  });

  it("is a button when a select listener is set, and dense shrinks it", async () => {
    let n = 0;
    const w = mount(NqGlanceRow, { props: { label: "Open", dense: true, onSelect: () => n++ } });
    expect(w.attributes("data-slot")).toBe("glance-row");
    const b = w.find("button");
    expect(b.classes()).toEqual(expect.arrayContaining(["px-2", "py-1"]));
    await b.trigger("click");
    expect(n).toBe(1);
  });
});

describe("NqTrayPopover", () => {
  it("renders a labelled group with caret, header, rows and actions", async () => {
    const chosen: string[] = [];
    const w = mount(NqTrayPopover, {
      props: { title: "Today", subtitle: "Mon", actions: [{ id: "quit", label: "Quit", shortcut: "Ctrl+Q", danger: true, onSelect: () => chosen.push("fn") }] },
      slots: { default: () => h(NqGlanceRow, { label: "Row" }) },
    });
    expect(w.attributes("data-slot")).toBe("tray-popover");
    expect(w.attributes("role")).toBe("group");
    expect(w.attributes("aria-label")).toBe("Today");
    expect(w.find("span[aria-hidden]").classes()).toContain("end-5");
    expect(w.find("h2").text()).toBe("Today");
    expect(w.find('[data-slot="glance-row"]').exists()).toBe(true);
    const b = w.find("footer button");
    expect(b.classes()).toContain("text-nq-danger-text");
    expect(b.find("kbd").attributes("dir")).toBe("ltr");
    await b.trigger("click");
    expect(chosen).toEqual(["fn"]);
    expect(w.emitted("action")![0]).toEqual(["quit"]);
  });

  it("moves or hides the caret", () => {
    expect(mount(NqTrayPopover, { props: { title: "t", caret: "start" } }).find("span[aria-hidden]").classes()).toContain("start-5");
    expect(mount(NqTrayPopover, { props: { title: "t", caret: false } }).find("span[aria-hidden]").exists()).toBe(false);
  });
});

describe("NqWatchGlance", () => {
  it("is a rounded square or a round face", () => {
    const sq = mount(NqWatchGlance, { props: { title: "10:09" }, slots: { default: "x" } });
    expect(sq.attributes("data-slot")).toBe("watch-glance");
    expect(sq.attributes("data-shape")).toBe("square");
    expect(sq.classes()).toContain("rounded-[2rem]");
    const round = mount(NqWatchGlance, { props: { title: "10:09", shape: "round" }, slots: { default: "x", headerEnd: "80%" } });
    expect(round.attributes("data-shape")).toBe("round");
    expect(round.classes()).toEqual(expect.arrayContaining(["aspect-square", "rounded-full"]));
    expect(round.text()).toContain("80%");
  });
});

describe("NqWidgetTile", () => {
  it("renders a small home tile with a label and a progress bar", () => {
    const w = mount(NqWidgetTile, { props: { title: "Steps", value: 8200, caption: "of 10k", progress: 82, tone: "success" } });
    expect(w.attributes("data-slot")).toBe("widget-tile");
    expect(w.attributes("data-size")).toBe("small");
    expect(w.attributes("data-surface")).toBe("home");
    expect(w.attributes("role")).toBe("group");
    expect(w.attributes("aria-label")).toBe("Steps, 8200, of 10k");
    expect(w.classes()).toEqual(expect.arrayContaining(["size-38", "rounded-3xl", "bg-card"]));
    const bar = w.find('[role="presentation"] > div');
    expect(bar.attributes("style")).toContain("width: 82%");
    expect(bar.classes()).toContain("bg-nq-success");
  });

  it("is translucent on the lock screen and draws a ring when circular", () => {
    const w = mount(NqWidgetTile, { props: { title: "Steps", size: "circular", surface: "lock", value: "82", progress: 50 } });
    expect(w.classes()).toEqual(expect.arrayContaining(["size-16", "rounded-full", "bg-card/55"]));
    const circles = w.findAll("circle");
    expect(circles).toHaveLength(2);
    expect(circles[1]!.attributes("stroke-dashoffset")).toBe(String(2 * Math.PI * 26 * 0.5));
    expect(w.find("svg").classes()).toContain("rtl:scale-y-[-1]");
  });

  it("is a labelled button when an open listener is set", async () => {
    let n = 0;
    const w = mount(NqWidgetTile, { props: { title: "Timer", value: "00:42", onOpen: () => n++ } });
    expect(w.attributes("data-slot")).toBe("widget-tile");
    expect(w.classes()).toContain("contents");
    const b = w.find("button");
    expect(b.attributes("aria-label")).toBe("Timer, 00:42");
    await b.trigger("click");
    expect(n).toBe(1);
  });

  it("shows children only in medium and large", () => {
    const small = mount(NqWidgetTile, { props: { title: "T" }, slots: { default: "<i>extra</i>" } });
    expect(small.find("i").exists()).toBe(false);
    const medium = mount(NqWidgetTile, { props: { title: "T", size: "medium" }, slots: { default: "<i>extra</i>" } });
    expect(medium.find("i").exists()).toBe(true);
  });
});

const widgets = [
  { id: "steps", title: "Steps", sizes: ["small", "medium"] as const, preview: (size: string) => h(NqWidgetTile, { title: "Steps", size: size as "small" }) },
  { id: "timer", title: "Timer", sizes: ["small"] as const },
];

describe("NqWidgetGallery", () => {
  it("lists widgets, switches the preview size and adds", async () => {
    const w = mount(NqWidgetGallery, { props: { widgets } });
    expect(w.attributes("role")).toBe("list");
    expect(w.attributes("aria-label")).toBe("Widget gallery");
    expect(w.findAll('[role="listitem"]')).toHaveLength(2);
    expect(w.find('[data-slot="widget-tile"]').attributes("data-size")).toBe("small");
    const radios = w.findAll('[role="radio"]');
    expect(radios).toHaveLength(2);
    expect(radios[0]!.attributes("aria-checked")).toBe("true");
    await radios[1]!.trigger("click");
    expect(radios[1]!.attributes("aria-checked")).toBe("true");
    expect(w.find('[data-slot="widget-tile"]').attributes("data-size")).toBe("medium");
    await w.find("button[data-slot=button]").trigger("click");
    expect(w.emitted("add")![0]).toEqual(["steps", "medium"]);
  });

  it("shows Remove with a listener and a disabled Added without", async () => {
    const without = mount(NqWidgetGallery, { props: { widgets, added: ["timer"] } });
    const added = without.findAll("button[data-slot=button]")[1]!;
    expect(added.text()).toBe("Added");
    expect(added.attributes("disabled")).toBeDefined();
    let removed = "";
    const withRemove = mount(NqWidgetGallery, { props: { widgets, added: ["timer"], onRemove: (id: string) => (removed = id) } });
    const remove = withRemove.findAll("button[data-slot=button]")[1]!;
    expect(remove.text()).toBe("Remove");
    await remove.trigger("click");
    expect(removed).toBe("timer");
  });

  it("uses Arabic strings under an Arabic provider", () => {
    const w = mount(
      { components: { NasaqProvider, NqWidgetGallery }, props: ["w"], template: `<NasaqProvider locale="ar" target="scope"><NqWidgetGallery :widgets="w" /></NasaqProvider>` },
      { props: { w: widgets } },
    );
    expect(w.text()).toContain("إضافة الودجت");
    expect(w.find('[role="list"]').attributes("aria-label")).toBe("معرض الودجت");
  });
});
