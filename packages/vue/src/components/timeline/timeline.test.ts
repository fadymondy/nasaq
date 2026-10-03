import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqTimeline, NqTimelineItem } from ".";

describe("NqTimeline", () => {
  it("is an ol with items that carry the rail, the marker and the content", () => {
    const w = mount({
      components: { NqTimeline, NqTimelineItem },
      setup: () => ({ ago: new Date(Date.now() - 3 * 3600_000) }),
      template: `<NqTimeline class="gap-2">
        <NqTimelineItem :actor="{ name: 'Sara Alharbi' }" title="Assigned" :time="ago" />
        <NqTimelineItem title="Opened" description="Redirect"><template #icon><svg data-i /></template><b data-extra /></NqTimelineItem>
      </NqTimeline>`,
    });
    const ol = w.find("ol");
    expect(ol.attributes("data-slot")).toBe("timeline");
    expect(ol.classes()).toEqual(expect.arrayContaining(["list-none", "flex-col", "gap-2"]));
    const items = w.findAll('[data-slot="timeline-item"]');
    expect(items).toHaveLength(2);
    expect(items[0]!.classes()).toContain("group/timeline");
    expect(items[0]!.find('[data-slot="avatar"]').exists()).toBe(true);
    expect(items[0]!.find("time").text()).toBe("3 hours ago");
    expect(items[0]!.find('[data-slot="timeline-rail"]').classes()).toContain("group-last/timeline:hidden");
    expect(items[1]!.find("[data-i]").exists()).toBe(true);
    expect(items[1]!.find('[data-slot="avatar"]').exists()).toBe(false);
    expect(items[1]!.find("time").exists()).toBe(false);
    expect(items[1]!.text()).toContain("Redirect");
    expect(items[1]!.find("[data-extra]").exists()).toBe(true);
  });

  it("falls back to a dot marker with no icon or actor", () => {
    const w = mount(NqTimelineItem, { props: { title: "Plain" } });
    expect(w.find('[data-slot="timeline-marker"] span[aria-hidden="true"]').classes()).toContain("border-nq-line");
  });
});
