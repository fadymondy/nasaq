import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqProxyHosts, type ProxyHost } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const hosts: ProxyHost[] = [
  { id: "h1", hosts: ["app.example.com", "www.example.com"], upstream: "http://10.0.0.5:3000", tlsMode: "auto", websockets: true, enabled: true, status: "online" },
  { id: "h2", hosts: ["old.example.org"], upstream: "http://localhost:8080", tlsMode: "off", websockets: false, enabled: false, status: "offline" },
];
const dialog = () => document.body.querySelector<HTMLElement>('[data-slot="proxy-host-dialog"]');
const button = (text: string) => [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text);
const cb = () => vi.fn(async () => ({}));

describe("NqProxyHosts", () => {
  it("lists hosts, upstream and status", () => {
    const w = mount(NqProxyHosts, { props: { hosts, onSave: cb(), onDelete: cb() }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("proxy-hosts");
    expect(w.text()).toContain("app.example.com");
    expect(w.text()).toContain("http://10.0.0.5:3000");
    expect(w.text()).toContain("Add proxy host");
    expect(w.find('[role="switch"]').exists()).toBe(false);
  });

  it("searches by upstream", async () => {
    const w = mount(NqProxyHosts, { props: { hosts, onSave: cb(), onDelete: cb() }, attachTo: document.body });
    await w.find("input[type=search]").setValue("localhost");
    expect(w.text()).toContain("old.example.org");
    expect(w.text()).not.toContain("app.example.com");
  });

  it("flips the enabled switch through onToggle", async () => {
    const onToggle = cb();
    const w = mount(NqProxyHosts, { props: { hosts, onSave: cb(), onDelete: cb(), onToggle }, attachTo: document.body });
    const sw = w.findAll('[role="switch"]');
    expect(sw).toHaveLength(2);
    await sw[1]!.trigger("click");
    await flushPromises();
    expect(onToggle).toHaveBeenCalledWith("h2", true);
  });

  it("shows the error a toggle resolves with", async () => {
    const onToggle = vi.fn(async () => ({ error: "Nope" }));
    const w = mount(NqProxyHosts, { props: { hosts, onSave: cb(), onDelete: cb(), onToggle }, attachTo: document.body });
    await w.findAll('[role="switch"]')[0]!.trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Nope");
  });

  it("validates the dialog, then saves a new host", async () => {
    const onSave = cb();
    mount(NqProxyHosts, { props: { hosts, onSave, onDelete: cb() }, attachTo: document.body });
    button("Add proxy host")!.click();
    await flushPromises();
    expect(dialog()).not.toBeNull();
    button("Save proxy host")!.click();
    await flushPromises();
    expect(onSave).not.toHaveBeenCalled();
    expect(dialog()!.textContent).toContain("Enter valid domain names");
    const area = dialog()!.querySelector<HTMLTextAreaElement>("textarea")!;
    area.value = "new.example.com";
    area.dispatchEvent(new Event("input"));
    const up = dialog()!.querySelector<HTMLInputElement>("input")!;
    up.value = "http://10.0.0.9:80";
    up.dispatchEvent(new Event("input"));
    await flushPromises();
    button("Save proxy host")!.click();
    await flushPromises();
    expect(onSave).toHaveBeenCalledTimes(1);
    const calls = onSave.mock.calls as unknown as [{ hosts: string[]; upstream: string }, string | undefined][];
    expect(calls[0]![0]).toMatchObject({ hosts: ["new.example.com"], upstream: "http://10.0.0.9:80" });
    expect(calls[0]![1]).toBeUndefined();
  });

  it("deletes through a confirmation", async () => {
    const onDelete = cb();
    const w = mount(NqProxyHosts, { props: { hosts, onSave: cb(), onDelete }, attachTo: document.body });
    await w.findAll("tbody tr")[0]!.trigger("contextmenu", { clientX: 4, clientY: 4 });
    await flushPromises();
    [...document.body.querySelectorAll<HTMLElement>("[role=menuitem]")].find((i) => i.textContent?.includes("Delete"))!.click();
    await flushPromises();
    expect(document.body.textContent).toContain("app.example.com");
    [...document.body.querySelectorAll<HTMLButtonElement>("[role=alertdialog] button")].find((b) => b.textContent?.trim() === "Delete")!.click();
    await flushPromises();
    expect(onDelete).toHaveBeenCalledWith("h1");
  });

  it("speaks Arabic", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqProxyHosts, { hosts, onSave: cb(), onDelete: cb() })) }, { attachTo: document.body });
    expect(w.text()).toContain("إضافة مضيف وكيل");
  });
});
