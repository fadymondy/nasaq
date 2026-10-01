import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardFooter, NqCardHeader, NqCardTitle } from ".";

const Demo = defineComponent({
  components: { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardFooter, NqCardHeader, NqCardTitle },
  template: `<NqCard class="max-w-sm"><NqCardHeader><NqCardTitle as="h3">Title</NqCardTitle><NqCardDescription>Desc</NqCardDescription>
    <NqCardAction>Act</NqCardAction></NqCardHeader><NqCardContent class="py-2">Body</NqCardContent><NqCardFooter class="justify-end">Foot</NqCardFooter></NqCard>`,
});

describe("NqCard", () => {
  it("emits every data-slot with the React classes", () => {
    const w = mount(Demo);
    const slot = (s: string) => w.find(`[data-slot="${s}"]`);
    expect(slot("card").classes()).toEqual(expect.arrayContaining(["rounded-card", "bg-card", "py-4", "max-w-sm"]));
    expect(slot("card-header").classes()).toEqual(expect.arrayContaining(["grid", "px-4"]));
    expect(slot("card-description").classes()).toContain("text-muted-foreground");
    expect(slot("card-action").classes()).toContain("justify-self-end");
    expect(slot("card-content").classes()).toEqual(expect.arrayContaining(["px-4", "py-2"]));
    expect(slot("card-footer").classes()).toEqual(expect.arrayContaining(["flex", "gap-2", "justify-end"]));
  });

  it("the title is a div, or the heading you ask for", () => {
    const w = mount(Demo);
    expect(w.find('[data-slot="card-title"]').element.tagName).toBe("H3");
    expect(mount(NqCardTitle).element.tagName).toBe("DIV");
  });
});
