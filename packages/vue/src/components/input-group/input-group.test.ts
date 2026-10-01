import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, ref } from "vue";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput, NqInputGroupText } from ".";

const Demo = defineComponent({
  components: { NqInputGroup, NqInputGroupAddon, NqInputGroupInput, NqInputGroupText },
  setup: () => ({ url: ref("") }),
  template: `<NqInputGroup class="max-w-sm"><NqInputGroupAddon><NqInputGroupText dir="ltr">https://</NqInputGroupText></NqInputGroupAddon>
    <NqInputGroupInput v-model="url" ltr placeholder="nasaq.app" /><NqInputGroupAddon align="end">.app</NqInputGroupAddon></NqInputGroup>`,
});

describe("NqInputGroup", () => {
  it("renders the shell, addons by logical edge, and the borderless input", () => {
    const w = mount(Demo);
    const shell = w.find('[data-slot="input-group"]');
    expect(shell.attributes("role")).toBe("group");
    expect(shell.classes()).toEqual(expect.arrayContaining(["rounded-control", "max-w-sm"]));
    const [start, end] = w.findAll('[data-slot="input-group-addon"]');
    expect(start!.attributes("data-align")).toBe("start");
    expect(start!.classes()).toContain("order-first");
    expect(end!.attributes("data-align")).toBe("end");
    expect(end!.classes()).toContain("order-last");
    expect(w.find('[data-slot="input-group-text"]').attributes("dir")).toBe("ltr");
    const input = w.find('[data-slot="input-group-input"]');
    expect(input.attributes("dir")).toBe("ltr");
    expect(input.attributes("placeholder")).toBe("nasaq.app");
    expect(input.classes()).toEqual(expect.arrayContaining(["border-0", "text-start"]));
  });

  it("v-model updates", async () => {
    const w = mount(Demo);
    await w.find("input").setValue("nasaq.app");
    expect((w.find("input").element as HTMLInputElement).value).toBe("nasaq.app");
  });
});
