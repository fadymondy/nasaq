// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { createApp, createSSRApp, defineComponent, h, nextTick, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import Nasaq, {
  NasaqProvider,
  NqBadge,
  NqButton,
  NqCheckbox,
  NqDialog,
  NqField,
  NqInput,
  NqMoney,
  NqPagination,
  NqTabs,
  NqTabsList,
  NqTabsPanel,
  NqTabsTrigger,
  useCurrency,
} from "../src/index";

const ssr = (render: () => ReturnType<typeof h>) => renderToString(createSSRApp(defineComponent({ render })));

function mount(render: () => ReturnType<typeof h> | ReturnType<typeof h>[]) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(defineComponent({ render }));
  app.mount(host);
  return { host, app };
}

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

describe("markup matches the .nq-* classes", () => {
  it("button carries variant, size and busy state", async () => {
    const html = await ssr(() => h(NqButton, { variant: "primary", size: "sm", loading: true }, () => "Save"));
    expect(html).toContain('class="nq-button"');
    expect(html).toContain('data-variant="primary"');
    expect(html).toContain('data-size="sm"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("disabled");
  });

  it("badge uses tag colours over variants", async () => {
    expect(await ssr(() => h(NqBadge, { tag: "teal" }, () => "New"))).toContain('data-tag="teal"');
    expect(await ssr(() => h(NqBadge, { variant: "success" }, () => "Paid"))).toContain('data-variant="success"');
  });

  it("field wires label, hint and error to the input", async () => {
    const html = await ssr(() => h(NqField, { label: "Email", hint: "Work address", error: "Required" }, () => h(NqInput)));
    const id = /for="([^"]+)"/.exec(html)![1];
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`aria-describedby="${id}-hint ${id}-error"`);
    expect(html).toContain('aria-invalid="true"');
  });
});

describe("money", () => {
  it("defaults to USD, and SAR under an Arabic provider", async () => {
    expect(await ssr(() => h(NqMoney, { amount: 12 }))).toContain("$12.00");
    const ar = await ssr(() => h(NasaqProvider, { locale: "ar", target: "scope" }, () => h(NqMoney, { amount: 12 })));
    expect(ar).toContain('dir="rtl"');
    expect(ar).not.toContain("$");
    expect(ar).not.toMatch(/₪|ILS/);
  });

  it("provider currency flows to useCurrency, a prop overrides it", async () => {
    const Probe = defineComponent({
      props: { own: String },
      setup(props) {
        const c = useCurrency(() => props.own);
        return () => h("i", c.value);
      },
    });
    const html = await ssr(() => h(NasaqProvider, { currency: "EUR", target: "scope" }, () => [h(Probe), h(Probe, { own: "GBP" })]));
    expect(html).toContain("<i>EUR</i>");
    expect(html).toContain("<i>GBP</i>");
  });
});

describe("interactive", () => {
  it("provider writes lang, dir and theme to <html>", async () => {
    mount(() => h(NasaqProvider, { locale: "ar", theme: "dark" }, () => h("p", "x")));
    await nextTick();
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("v-model on input and checkbox", async () => {
    const text = ref("");
    const on = ref(false);
    const { host } = mount(() => [
      h(NqInput, { modelValue: text.value, "onUpdate:modelValue": (v: string) => (text.value = v) }),
      h(NqCheckbox, { modelValue: on.value, label: "Agree", "onUpdate:modelValue": (v: boolean) => (on.value = v) }),
    ]);
    const input = host.querySelector<HTMLInputElement>(".nq-input")!;
    input.value = "hi";
    input.dispatchEvent(new Event("input"));
    host.querySelector<HTMLInputElement>(".nq-checkbox")!.click();
    await nextTick();
    expect(text.value).toBe("hi");
    expect(on.value).toBe(true);
  });

  it("tabs switch panels and keep aria in sync", async () => {
    const tab = ref("a");
    const { host } = mount(() =>
      h(NqTabs, { modelValue: tab.value, "onUpdate:modelValue": (v: string) => (tab.value = v) }, () => [
        h(NqTabsList, () => [h(NqTabsTrigger, { value: "a" }, () => "A"), h(NqTabsTrigger, { value: "b" }, () => "B")]),
        h(NqTabsPanel, { value: "a" }, () => "first"),
        h(NqTabsPanel, { value: "b" }, () => "second"),
      ]),
    );
    host.querySelectorAll<HTMLElement>('[role="tab"]')[1]!.click();
    await nextTick();
    expect(tab.value).toBe("b");
    expect(host.querySelectorAll('[role="tab"]')[1]!.getAttribute("aria-selected")).toBe("true");
    expect(host.textContent).toContain("second");
    expect(host.textContent).not.toContain("first");
  });

  it("dialog opens from v-model:open and closes back through it", async () => {
    const open = ref(false);
    const { host } = mount(() =>
      h(NqDialog, { open: open.value, title: "Invite", "onUpdate:open": (v: boolean) => (open.value = v) }, () => "body"),
    );
    const dialog = host.querySelector("dialog")!;
    expect(dialog.open).toBe(false);
    open.value = true;
    await nextTick();
    expect(dialog.open).toBe(true);
    host.querySelector<HTMLElement>(".nq-dialog-close")!.click();
    await nextTick();
    expect(open.value).toBe(false);
  });

  it("pagination emits the page and labels in Arabic", async () => {
    const page = ref(1);
    const { host } = mount(() =>
      h(NasaqProvider, { locale: "ar", target: "scope" }, () =>
        h(NqPagination, { modelValue: page.value, pageCount: 9, "onUpdate:modelValue": (v: number) => (page.value = v) }),
      ),
    );
    expect(host.querySelector("nav")!.getAttribute("aria-label")).toBe("ترقيم الصفحات");
    [...host.querySelectorAll<HTMLElement>(".nq-pagination-link")].find((b) => b.textContent === "التالي")!.click();
    await nextTick();
    expect(page.value).toBe(2);
  });

  it("app.use(Nasaq) registers components globally", () => {
    const host = document.createElement("div");
    const app = createApp({ template: "<div/>" });
    app.use(Nasaq);
    expect(app.component("NqButton")).toBeTruthy();
    expect(app.component("NasaqProvider")).toBeTruthy();
    expect(host).toBeTruthy();
  });
});
