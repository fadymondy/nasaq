// Hosts for the Frameworks/* stories: the same Nasaq look without React. Each story keeps its source in one
// string (HTML, Alpine markup or a Vue template) that is both what runs and what the Docs tab shows, so it can
// be copied as is. The .nq-* classes come from @nasaq/html; the lab already loads the tokens.
import "@nasaq/html/components.css";
import * as NasaqHtml from "@nasaq/html";
import nasaq from "@nasaq/html/alpine";
import Nasaq from "@nasaq/vue";
import Alpine from "alpinejs";
import { useEffect, useRef } from "react";
import { createApp, type Component } from "vue";

// What the CDN build (nasaq.global.js) sets, so inline handlers such as onclick="Nasaq.toast(…)" work here too.
(window as unknown as { Nasaq: typeof NasaqHtml }).Nasaq = NasaqHtml;

/** Plain HTML + the vanilla behaviours (data-nq="…", data-nq-open, data-nq-money, data-nq-tooltip). */
export function HtmlDemo({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stopDelegate = NasaqHtml.delegate();
    const stopInit = NasaqHtml.init(ref.current!);
    return () => {
      stopInit();
      stopDelegate();
    };
  }, [html]);
  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}

let alpineStarted = false;
function startAlpine() {
  if (alpineStarted) return;
  alpineStarted = true;
  Alpine.plugin(nasaq);
  (window as unknown as { Alpine: typeof Alpine }).Alpine = Alpine;
  Alpine.start();
}

/** Alpine markup (x-data="nqTabs", x-nq:menu, $nq…), the way Livewire and Filament pages use it. */
export function AlpineDemo({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    startAlpine();
    const el = ref.current!;
    el.innerHTML = html;
    Alpine.initTree(el);
    return () => {
      Alpine.destroyTree(el);
      el.innerHTML = "";
    };
  }, [html]);
  return <div ref={ref} />;
}

/** A Vue 3 app with `app.use(Nasaq)`; `template` is compiled in the browser. */
export function VueDemo({ template, setup }: { template: string; setup?: () => Record<string, unknown> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const app = createApp({ template, setup } as Component);
    app.use(Nasaq);
    app.mount(ref.current!);
    return () => app.unmount();
  }, [template, setup]);
  return <div ref={ref} />;
}

/** Story parameters that put the framework source, not the React wrapper, in the Docs tab. */
export const source = (code: string, language: "html" | "vue" = "html") => ({
  docs: { source: { code: code.trim(), language } },
});
