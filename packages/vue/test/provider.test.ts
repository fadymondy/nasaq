import { afterEach, describe, expect, it } from "vitest";
import { createApp, createSSRApp, defineComponent, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import Nasaq, { NasaqProvider, useCurrency } from "../src/index";

const ssr = (render: () => ReturnType<typeof h>) => renderToString(createSSRApp(defineComponent({ render })));

afterEach(() => {
  document.body.innerHTML = "";
});

describe("provider", () => {
  it("defaults to USD, SAR in Arabic, and a currency prop wins", async () => {
    const Probe = defineComponent({
      props: { own: String },
      setup(props) {
        const c = useCurrency(() => props.own);
        return () => h("i", c.value);
      },
    });
    expect(await ssr(() => h(NasaqProvider, { target: "scope" }, () => h(Probe)))).toContain("<i>USD</i>");
    const ar = await ssr(() => h(NasaqProvider, { locale: "ar", target: "scope" }, () => h(Probe)));
    expect(ar).toContain('dir="rtl"');
    expect(ar).toContain("<i>SAR</i>");
    const eur = await ssr(() => h(NasaqProvider, { currency: "EUR", target: "scope" }, () => [h(Probe), h(Probe, { own: "GBP" })]));
    expect(eur).toContain("<i>EUR</i>");
    expect(eur).toContain("<i>GBP</i>");
  });

  it("writes lang, dir and theme to <html>", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    createApp(defineComponent({ render: () => h(NasaqProvider, { locale: "ar", theme: "dark" }, () => h("p", "x")) })).mount(host);
    await nextTick();
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("app.use(Nasaq) registers every Nq component", () => {
    const app = createApp({});
    app.use(Nasaq);
    expect(app.component("NasaqProvider")).toBeTruthy();
    expect(app.component("NqButton")).toBeTruthy();
  });
});
