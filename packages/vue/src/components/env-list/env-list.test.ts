import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { MASK, NqEnvList, checkEnvKey, looksPublic, parseEnv, serializeEnv, type EnvVariable } from ".";
import { NasaqProvider } from "../../provider";

const variables: EnvVariable[] = [
  { key: "DATABASE_URL", value: "postgres://secret-host/db", secret: true, description: "Main database" },
  { key: "VITE_API_URL", value: "https://api.example.com", secret: false },
];

afterEach(() => {
  document.body.innerHTML = "";
});

const q = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;
async function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  el.value = value;
  el.dispatchEvent(new Event("input"));
  await flushPromises();
}
async function submit(form: Element) {
  form.dispatchEvent(new Event("submit", { cancelable: true }));
  await flushPromises();
}

describe("env-list helpers", () => {
  it("parses, serialises and checks keys", () => {
    const r = parseEnv('A=1\nexport B="two words"\nA=3\nbad key=1\n9X=1');
    expect(r.variables).toEqual([
      { key: "A", value: "3" },
      { key: "B", value: "two words" },
    ]);
    expect(r.duplicates).toEqual(["A"]);
    expect(r.issues.map((i) => i.problem)).toEqual(["no-equals", "invalid-key"]);
    expect(serializeEnv([{ key: "B", value: "two words" }])).toBe('B="two words"\n');
    expect(checkEnvKey("A", ["A"])).toBe("duplicate");
    expect(checkEnvKey("", [])).toBe("empty");
    expect(looksPublic("NEXT_PUBLIC_X")).toBe(true);
  });
});

describe("NqEnvList", () => {
  it("masks secrets, never puts them in the DOM, and reveals on request", async () => {
    const w = mount(NqEnvList, { props: { variables, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("env-list");
    expect(w.attributes("aria-label")).toBe("Environment variables");
    expect(w.classes()).toContain("extra");
    const rows = w.findAll('[data-slot="env-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.attributes("data-secret")).toBeDefined();
    expect(rows[0]!.find('[data-slot="env-value"]').text()).toBe(MASK);
    expect(rows[0]!.find('[data-slot="env-value"]').attributes("aria-label")).toBe("Value hidden");
    expect(w.html()).not.toContain("secret-host");
    expect(rows[1]!.find('[data-slot="env-value"]').text()).toBe("https://api.example.com");
    expect(rows[1]!.attributes("data-secret")).toBeUndefined();
    const reveal = rows[0]!.find('[aria-label="Reveal DATABASE_URL"]');
    expect(reveal.attributes("aria-pressed")).toBe("false");
    await reveal.trigger("click");
    const row = w.findAll('[data-slot="env-row"]')[0]!;
    expect(row.attributes("data-revealed")).toBeDefined();
    expect(row.find('[data-slot="env-value"]').text()).toBe("postgres://secret-host/db");
    expect(row.find('[aria-label="Hide DATABASE_URL"]').attributes("aria-pressed")).toBe("true");
  });

  it("hides a revealed value again after the timeout", async () => {
    const w = mount(NqEnvList, { props: { variables, revealTimeout: 40 } });
    await w.find('[aria-label="Reveal DATABASE_URL"]').trigger("click");
    expect(w.html()).toContain("secret-host");
    await new Promise((r) => setTimeout(r, 120));
    await flushPromises();
    expect(w.html()).not.toContain("secret-host");
  });

  it("offers no edit actions when read-only, and an empty state with none", () => {
    const ro = mount(NqEnvList, { props: { variables, readOnly: true, onSave: async () => undefined, onDelete: async () => undefined, onImport: async () => undefined } });
    expect(ro.find('[aria-label="Edit DATABASE_URL"]').exists()).toBe(false);
    expect(ro.text()).not.toContain("Add variable");
    const empty = mount(NqEnvList, { props: { variables: [], onSave: async () => undefined } });
    expect(empty.find('[data-slot="empty-state"]').exists()).toBe(true);
    expect(empty.text()).toContain("No variables yet");
  });

  it("filters when there are more than five variables", async () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ key: `KEY_${i}`, value: "v" }));
    const w = mount(NqEnvList, { props: { variables: many } });
    await w.find('input[type="search"]').setValue("key_3");
    expect(w.findAll('[data-slot="env-row"]')).toHaveLength(1);
    await w.find('input[type="search"]').setValue("zzz");
    expect(w.text()).toContain("No variables match your filter.");
  });

  it("validates the key in the add dialog and saves a variable", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqEnvList, { props: { variables, onSave }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text() === "Add variable")!.trigger("click");
    await flushPromises();
    const key = q<HTMLInputElement>('input[name="key"]');
    await type(key, "DATABASE_URL");
    expect(q('[role="alert"]').textContent).toBe("A variable with this name already exists.");
    await type(key, "9bad");
    expect(q('[role="alert"]').textContent).toContain("do not start with a digit");
    await type(key, "API_TOKEN");
    expect(document.querySelector('[id$="-key-error"]')).toBeNull();
    await type(q<HTMLTextAreaElement>('textarea[name="value"]'), "abc");
    await submit(q("form"));
    expect(onSave).toHaveBeenCalledWith({ key: "API_TOKEN", value: "abc", secret: true }, undefined);
    await new Promise((r) => setTimeout(r, 250));
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull();
    w.unmount();
  });

  it("keeps the dialog open with the callback error", async () => {
    const onSave = vi.fn().mockResolvedValue({ error: "Not allowed" });
    const w = mount(NqEnvList, { props: { variables, onSave }, attachTo: document.body });
    await w.find('[aria-label="Edit VITE_API_URL"]').trigger("click");
    await flushPromises();
    expect(q('[data-slot="dialog-title"]').textContent).toBe("Edit VITE_API_URL");
    await submit(q("form"));
    expect(onSave).toHaveBeenCalledWith({ key: "VITE_API_URL", value: "https://api.example.com", secret: false }, "VITE_API_URL");
    expect(q('[data-slot="alert"]').textContent).toContain("Not allowed");
    expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeNull();
    w.unmount();
  });

  it("previews an import, flags conflicts and skips them unless overwrite is on", async () => {
    const onImport = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqEnvList, { props: { variables, onImport }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text() === "Import .env")!.trigger("click");
    await flushPromises();
    await type(q<HTMLTextAreaElement>("textarea"), "DATABASE_URL=new\nNEXT_PUBLIC_X=1\nSECRET=2\nnot a line");
    expect(q('form [aria-live="polite"]').textContent).toContain("3 variables found");
    expect(q('form [aria-live="polite"]').textContent).toContain("1 already exists");
    expect(q('form [aria-live="polite"]').textContent).toContain("Line 4: expected NAME=value");
    expect(document.body.textContent).toContain("Import 2 variables");
    await submit(q("form"));
    expect(onImport).toHaveBeenCalledWith(
      [
        { key: "NEXT_PUBLIC_X", value: "1", secret: false },
        { key: "SECRET", value: "2", secret: true },
      ],
      { overwrite: false },
    );
    w.unmount();
  });

  it("asks before deleting and runs the callback on confirm", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqEnvList, { props: { variables, onDelete }, attachTo: document.body });
    await w.find('[aria-label="Delete VITE_API_URL"]').trigger("click");
    await flushPromises();
    expect(q('[data-slot="alert-dialog-title"]').textContent).toBe("Delete VITE_API_URL?");
    expect(onDelete).not.toHaveBeenCalled();
    const confirm = [...document.querySelectorAll<HTMLElement>('[data-slot="alert-dialog-content"] button')].find((b) => b.textContent?.trim() === "Delete")!;
    confirm.click();
    await flushPromises();
    expect(onDelete).toHaveBeenCalledWith("VITE_API_URL");
    w.unmount();
  });

  it("emits the environment change from the tabs", async () => {
    const w = mount(NqEnvList, { props: { variables, environments: [{ id: "dev", label: "Development" }, { id: "prod", label: "Production" }] } });
    const tabs = w.findAll('[data-slot="tabs-tab"]');
    expect(tabs[0]!.attributes("data-active")).toBeDefined();
    await tabs[1]!.trigger("mousedown");
    await tabs[1]!.trigger("click");
    await flushPromises();
    expect(w.emitted("update:environment")?.[0]).toEqual(["prod"]);
  });

  it("speaks Arabic under an Arabic provider", () => {
    const Host = defineComponent({ render: () => h(NasaqProvider, { locale: "ar", target: "scope" }, () => h(NqEnvList, { variables })) });
    const w = mount(Host);
    expect(w.text()).toContain("متغيرات البيئة");
    expect(w.find('[aria-label="كشف DATABASE_URL"]').exists()).toBe(true);
  });
});
