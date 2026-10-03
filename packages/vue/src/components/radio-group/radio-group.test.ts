import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { NqRadio, NqRadioCard, NqRadioGroup } from ".";

const Demo = defineComponent({
  components: { NqRadio, NqRadioCard, NqRadioGroup },
  template: `<NqRadioGroup default-value="email" aria-label="Contact by">
    <label><NqRadio value="email" /> Email</label>
    <label><NqRadio value="sms" /> SMS</label>
    <NqRadioCard value="pro" title="Pro" description="For teams" meta="29" />
  </NqRadioGroup>`,
});

describe("NqRadioGroup", () => {
  it("renders the group, radios and state attributes", () => {
    const w = mount(Demo);
    const group = w.find('[data-slot="radio-group"]');
    expect(group.attributes("role")).toBe("radiogroup");
    expect(group.attributes("aria-label")).toBe("Contact by");
    expect(group.classes()).toEqual(expect.arrayContaining(["flex", "flex-col", "gap-2"]));
    const [email, sms] = w.findAll('[data-slot="radio"]');
    expect(email!.attributes("aria-checked")).toBe("true");
    expect(email!.attributes("data-checked")).toBe("");
    expect(sms!.attributes("data-unchecked")).toBe("");
    expect(email!.classes()).toContain("after:-inset-1");
  });

  it("selects on click and moves the state", async () => {
    const w = mount(Demo, { attachTo: document.body });
    const [email, sms] = w.findAll('[data-slot="radio"]');
    await sms!.trigger("click");
    await flushPromises();
    expect(sms!.attributes("data-checked")).toBe("");
    expect(email!.attributes("data-checked")).toBeUndefined();
    w.unmount();
  });

  it("radio card shows title, description and meta", () => {
    const w = mount(Demo);
    const card = w.find('[data-slot="radio-card"]');
    expect(card.classes()).toContain("group/card");
    expect(card.find('[data-slot="radio-card-title"]').text()).toBe("Pro");
    expect(card.find('[data-slot="radio-card-description"]').text()).toBe("For teams");
    expect(card.find('[data-slot="radio-card-meta"]').text()).toBe("29");
    expect(card.find('[data-slot="radio-card-mark"]').attributes("aria-hidden")).toBe("true");
  });
});
