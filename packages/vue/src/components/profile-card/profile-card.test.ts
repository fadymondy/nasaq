import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqMentionChip, NqMentionText, NqPresenceAvatar, NqPresenceDot, NqProfileCard, NqProfileHoverCard, describeOffset, offsetFrom, presenceRank } from ".";

const sara = { id: "u1", name: "Sara Nasser", handle: "sara", email: "sara@example.com", role: "Design lead", presence: "online", statusText: "In a meeting", timeZone: "Asia/Riyadh", teams: ["Design", "Brand"] } as const;
const now = Date.UTC(2026, 2, 1, 12, 0, 0);

describe("helpers", () => {
  it("computes offsets and ranks presence", () => {
    expect(offsetFrom("Asia/Riyadh", "UTC", now)).toBe(180);
    expect(describeOffset(-90)).toEqual({ direction: "behind", hours: 1, minutes: 30 });
    expect(presenceRank("online")).toBeLessThan(presenceRank(undefined));
  });
});

describe("NqPresenceDot / NqPresenceAvatar", () => {
  it("speaks the state, with a hollow ring for offline", () => {
    const w = mount(NqPresenceDot, { props: { presence: "offline" } });
    expect(w.attributes("data-slot")).toBe("presence-dot");
    expect(w.attributes("role")).toBe("img");
    expect(w.attributes("aria-label")).toBe("Offline");
    expect(w.classes()).toEqual(expect.arrayContaining(["ring-1", "ring-inset", "size-2.5"]));
    const d = mount(NqPresenceDot, { props: { presence: "busy", decorative: true } });
    expect(d.attributes("aria-hidden")).toBe("true");
    expect(d.attributes("role")).toBeUndefined();
    expect(d.classes()).toContain("bg-nq-danger");
  });

  it("puts a dot on the avatar only when there is a presence", () => {
    expect(mount(NqPresenceAvatar, { props: { person: { name: "Sara Nasser", presence: "away" } } }).find('[data-slot="presence-dot"]').classes()).toContain("bg-nq-warning");
    expect(mount(NqPresenceAvatar, { props: { person: { name: "Sara Nasser" } } }).find('[data-slot="presence-dot"]').exists()).toBe(false);
  });
});

describe("NqProfileCard", () => {
  it("renders the person, local time and the offset to the viewer", () => {
    const w = mount(NqProfileCard, { props: { person: sara, now, viewerTimeZone: "UTC" } });
    expect(w.attributes("data-slot")).toBe("profile-card");
    expect(w.attributes("data-presence")).toBe("online");
    expect(w.text()).toContain("Sara Nasser");
    expect(w.text()).toContain("@sara");
    expect(w.text()).toContain("Design lead");
    expect(w.text()).toContain("In a meeting");
    expect(w.text()).toContain("3:00 PM");
    expect(w.text()).toContain("3h ahead of you");
    expect(w.text()).toContain("Design · Brand");
    expect(w.text()).toContain("sara@example.com");
    expect(w.find('[data-slot="profile-card-actions"]').exists()).toBe(false);
  });

  it("adds a button per listener and emits the person", async () => {
    const onMessage = vi.fn();
    const w = mount(NqProfileCard, { props: { person: sara, now, onMessage } });
    const buttons = w.findAll("button");
    expect(buttons).toHaveLength(1);
    await buttons[0]!.trigger("click");
    expect(onMessage).toHaveBeenCalledWith(sara);
  });

  it("notes night time and says Arabic words in an Arabic provider", () => {
    const night = Date.UTC(2026, 2, 1, 21, 0, 0); // midnight in Riyadh
    const w = mount(NqProfileCard, { props: { person: sara, now: night, viewerTimeZone: "UTC" } });
    expect(w.text()).toContain("It is night there");
    const ar = mount(
      { components: { NasaqProvider, NqProfileCard }, props: ["p"], template: `<NasaqProvider locale="ar" target="scope"><NqProfileCard :person="p" :now="${now}" viewer-time-zone="UTC" /></NasaqProvider>` },
      { props: { p: sara } },
    );
    expect(ar.text()).toContain("يسبقك بـ 3 س");
    expect(ar.text()).toContain("الوقت");
  });
});

describe("NqProfileHoverCard", () => {
  it("keeps a link as the trigger and opens a labelled dialog on tap", async () => {
    const w = mount(NqProfileHoverCard, { props: { person: sara, now, viewerTimeZone: "UTC", onViewProfile: () => {} }, slots: { default: '<a href="/people/u1">Sara Nasser</a>' }, attachTo: document.body });
    const trigger = w.find('[data-slot="hover-card-trigger"]');
    expect(trigger.element.tagName).toBe("A");
    expect(trigger.attributes("aria-haspopup")).toBe("dialog");
    await trigger.trigger("pointerdown", { pointerType: "touch" });
    await trigger.trigger("click");
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const card = document.querySelector<HTMLElement>('[data-slot="hover-card-content"]')!;
    expect(card).not.toBeNull();
    expect(card.getAttribute("role")).toBe("dialog");
    expect(card.getAttribute("aria-label")).toBe("Profile of Sara Nasser");
    expect(card.className).toContain("w-80");
    expect(card.querySelector('[data-slot="profile-card"]')).not.toBeNull();
    expect(card.querySelectorAll("button")).toHaveLength(1);
    w.unmount();
  });

  it("wraps plain text in a button", () => {
    const w = mount(NqProfileHoverCard, { props: { person: sara }, slots: { default: "Sara" } });
    expect(w.find('[data-slot="hover-card-trigger"]').element.tagName).toBe("BUTTON");
  });
});

describe("NqMentionChip / NqMentionText", () => {
  it("renders team chips with an icon and no card", () => {
    const w = mount(NqMentionChip, { props: { name: "Design", kind: "team" } });
    expect(w.attributes("data-slot")).toBe("mention-chip");
    expect(w.attributes("data-kind")).toBe("team");
    expect(w.text()).toBe("@Design");
    expect(w.find("svg").exists()).toBe(true);
    expect(w.attributes("role")).toBeUndefined();
  });

  it("makes a person chip a focusable button", () => {
    const w = mount(NqMentionChip, { props: { name: "Sara", person: sara } });
    const chip = w.find('[data-slot="mention-chip"]');
    expect(chip.attributes("role")).toBe("button");
    expect(chip.attributes("tabindex")).toBe("0");
    expect(chip.classes()).toContain("cursor-pointer");
  });

  it("splits text around mentions", () => {
    const w = mount(NqMentionText, {
      props: {
        text: "Thanks @Sara, looping in @Design",
        mentions: [
          { id: "u1", name: "Sara", start: 7, end: 12 },
          { id: "t1", name: "Design", start: 25, end: 32 },
        ],
        resolve: (id: string) => (id === "t1" ? { kind: "team" as const } : { person: sara }),
      },
    });
    expect(w.attributes("data-slot")).toBe("mention-text");
    expect(w.text()).toBe("Thanks @Sara, looping in @Design");
    expect(w.findAll('[data-slot="mention-chip"]')).toHaveLength(2);
    expect(w.findAll('[data-slot="mention-chip"]')[1]!.attributes("data-kind")).toBe("team");
  });
});
