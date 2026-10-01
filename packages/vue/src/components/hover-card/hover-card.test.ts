import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { NqHoverCard, NqHoverCardContent, NqHoverCardTrigger } from ".";

const Demo = defineComponent({
  components: { NqHoverCard, NqHoverCardContent, NqHoverCardTrigger },
  props: { delay: { type: Number, default: 0 } },
  template: `<NqHoverCard :delay="delay"><NqHoverCardTrigger href="/people/sara">@sara</NqHoverCardTrigger>
    <NqHoverCardContent class="w-80"><p>Sara Al-Harbi</p></NqHoverCardContent></NqHoverCard>`,
});

const content = () => document.querySelector<HTMLElement>('[data-slot="hover-card-content"]');

describe("NqHoverCard", () => {
  it("renders the trigger as a link and opens on hover", async () => {
    const w = mount(Demo, { attachTo: document.body });
    const trigger = w.find('[data-slot="hover-card-trigger"]');
    expect(trigger.element.tagName).toBe("A");
    expect(trigger.attributes("href")).toBe("/people/sara");
    expect(content()).toBeNull();
    await trigger.trigger("pointerenter", { pointerType: "mouse" });
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const el = content()!;
    expect(el).not.toBeNull();
    expect(el.className).toContain("rounded-floating");
    expect(el.className).toContain("w-80");
    expect(el.hasAttribute("data-open")).toBe(true);
    expect(trigger.attributes("data-popup-open")).toBe("");
    w.unmount();
  });
});
