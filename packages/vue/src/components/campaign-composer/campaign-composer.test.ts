import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqCampaignComposer } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const audiences = [{ id: "all", label: "Everyone", counts: { email: 1240, whatsapp: 610 } }];
const variables = [{ key: "name", label: "Name", sample: "Sara" }];
const base = { audiences, variables };

const button = (w: ReturnType<typeof mount>, text: string) => w.findAll("button").find((b) => b.text().includes(text))!;

describe("NqCampaignComposer", () => {
  it("renders the email form, an empty count and a disabled-looking checklist", () => {
    const w = mount(NqCampaignComposer, { props: base, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("campaign-composer");
    expect(w.classes()).toContain("lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]");
    expect(w.find('[data-slot="campaign-audience-count"]').text()).toContain("—");
    expect(w.text()).toContain("Subject");
    expect(w.text()).toContain("Choose an audience.");
    expect(w.text()).toContain("Add a subject.");
    expect(w.find('[data-slot="email-template-preview"]').exists()).toBe(true);
  });

  it("counts from onCountAudience and shows a failure", async () => {
    const onCountAudience = vi.fn(async () => 42);
    const w = mount(NqCampaignComposer, { props: { ...base, onCountAudience, defaultValue: { audienceId: "all" } }, attachTo: document.body });
    expect(w.find('[data-slot="campaign-audience-count"]').text()).toContain("Counting");
    await flushPromises();
    expect(onCountAudience).toHaveBeenCalledWith("all", "email");
    expect(w.find('[data-slot="campaign-audience-count"]').text()).toContain("42 people");
    const bad = mount(NqCampaignComposer, { props: { ...base, onCountAudience: async () => Promise.reject(new Error("x")), defaultValue: { audienceId: "all" } }, attachTo: document.body });
    await flushPromises();
    expect(bad.find('[data-slot="campaign-audience-count"]').text()).toContain("Could not count this audience.");
  });

  it("uses the static count, switches to WhatsApp and counts characters", async () => {
    const onChange = vi.fn();
    const w = mount(NqCampaignComposer, { props: { ...base, defaultValue: { audienceId: "all", body: "<p>Hi</p>" }, onChange }, attachTo: document.body });
    expect(w.find('[data-slot="campaign-audience-count"]').text()).toContain("1,240 people");
    await button(w, "WhatsApp").trigger("click");
    await flushPromises();
    expect(w.emitted("change")!.at(-1)![0]).toMatchObject({ channel: "whatsapp", body: "" });
    expect(w.find('[data-slot="campaign-audience-count"]').text()).toContain("610 people");
    expect(w.text()).toContain("0 / 1,024");
    expect(w.find('[data-slot="email-template-preview"]').exists()).toBe(false);
    await w.find("textarea").setValue("Hello {{name}}");
    expect(w.text()).toContain("14 / 1,024");
    expect(w.text()).toContain("Hello Sara");
    await button(w, "Name").trigger("click");
    expect((w.find("textarea").element as HTMLTextAreaElement).value).toBe("Hello {{name}}{{name}}");
  });

  it("confirms, then sends the draft", async () => {
    const onSend = vi.fn(async () => undefined);
    const w = mount(NqCampaignComposer, {
      props: { ...base, onSend, defaultValue: { audienceId: "all", subject: "Hi", body: "<p>Hello</p>" } },
      attachTo: document.body,
    });
    expect(w.text()).toContain("Ready to send.");
    await button(w, "Send campaign").trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("Send to 1,240 people?");
    const confirm = [...document.body.querySelectorAll("button")].find((b) => b.textContent?.includes("Send now"))!;
    confirm.click();
    await flushPromises();
    expect(onSend).toHaveBeenCalledWith({ channel: "email", audienceId: "all", subject: "Hi", body: "<p>Hello</p>" });
  });

  it("does not open the dialog while something is missing", async () => {
    const w = mount(NqCampaignComposer, { props: { ...base, onSend: async () => undefined }, attachTo: document.body });
    await button(w, "Send campaign").trigger("click");
    await flushPromises();
    expect(document.body.textContent).not.toContain("Send now");
  });

  it("locks and shows progress, with Stop", async () => {
    const onStopSending = vi.fn();
    const w = mount(NqCampaignComposer, {
      props: { ...base, progress: { sent: 40, failed: 10, total: 100 }, onStopSending, defaultValue: { audienceId: "all" } },
      attachTo: document.body,
    });
    expect(w.text()).toContain("40 of 100 sent");
    expect(w.text()).toContain("10 failed");
    expect(w.find('[role="progressbar"]').attributes("aria-valuenow")).toBe("50");
    expect(button(w, "Send campaign").attributes("disabled")).toBeDefined();
    await button(w, "Stop sending").trigger("click");
    expect(onStopSending).toHaveBeenCalled();
  });

  it("sends a test through the dialog", async () => {
    const onSendTest = vi.fn(async () => undefined);
    const w = mount(NqCampaignComposer, { props: { ...base, onSendTest, testRecipient: "me@example.com", defaultValue: { audienceId: "all", subject: "Hi", body: "<p>x</p>" } }, attachTo: document.body });
    await button(w, "Send a test").trigger("click");
    await flushPromises();
    const input = document.body.querySelector<HTMLInputElement>('input[type="email"]')!;
    expect(input.value).toBe("me@example.com");
    document.body.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await flushPromises();
    expect(onSendTest).toHaveBeenCalledWith(expect.objectContaining({ subject: "Hi" }), "me@example.com");
    expect(document.body.textContent).toContain("Test sent");
  });

  it("speaks Arabic under an Arabic provider", () => {
    const w = mount(
      { components: { NasaqProvider, NqCampaignComposer }, props: ["c"], template: `<NasaqProvider locale="ar" target="scope"><NqCampaignComposer v-bind="c" /></NasaqProvider>` },
      { props: { c: base }, attachTo: document.body },
    );
    expect(w.text()).toContain("القناة");
    expect(w.text()).toContain("إرسال الحملة");
    expect(w.text()).toContain("اختر جمهورًا.");
  });
});
