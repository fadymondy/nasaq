"use client";

import { useEffect, useRef, useState } from "react";

const BRANDS = ["nasaq", "fadymondy", "mahaam", "zekra", "moharrik", "seatfor", "health-debug", "circlexo", "hosbah", "orchestra", "togo", "matjar", "sanduq", "mizan", "qaima", "makhzan", "mawared"];

const button = "rounded-md px-2.5 py-1 text-xs font-medium transition-colors";
const toggle = (on: boolean) => `${button} ${on ? "bg-fd-accent text-fd-accent-foreground" : "text-fd-muted-foreground hover:text-fd-foreground"}`;

/** The live HTML + Alpine render of a component (public/preview/<name>.html), with theme, direction and brand switches. */
export function ComponentPreview({ name, title }: { name: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [dark, setDark] = useState(false);
  const [rtl, setRtl] = useState(false);
  const [brand, setBrand] = useState("nasaq");
  const [height, setHeight] = useState(260);

  const query = new URLSearchParams({ ...(dark && { theme: "dark" }), ...(rtl && { dir: "rtl" }), ...(brand !== "nasaq" && { brand }) }).toString();
  const src = `/preview/${name}.html${query ? `?${query}` : ""}`;

  // Follow the frame's content height (same origin), so tall components are not clipped and short ones leave no gap.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let observer: ResizeObserver | undefined;
    const attach = () => {
      const doc = el.contentDocument;
      if (!doc?.body) return;
      observer?.disconnect();
      observer = new ResizeObserver(() => setHeight(Math.min(Math.max(Math.ceil(doc.body.getBoundingClientRect().height), 160), 900)));
      observer.observe(doc.body);
    };
    el.addEventListener("load", attach);
    attach();
    return () => {
      el.removeEventListener("load", attach);
      observer?.disconnect();
    };
  }, [src]);

  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border bg-fd-card">
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
        <span className="me-auto px-1 text-xs font-medium text-fd-muted-foreground">Preview</span>
        <button type="button" className={toggle(!dark)} onClick={() => setDark(false)} aria-pressed={!dark}>
          Light
        </button>
        <button type="button" className={toggle(dark)} onClick={() => setDark(true)} aria-pressed={dark}>
          Dark
        </button>
        <span className="mx-1 h-4 w-px bg-fd-border" />
        <button type="button" className={toggle(!rtl)} onClick={() => setRtl(false)} aria-pressed={!rtl}>
          LTR
        </button>
        <button type="button" className={toggle(rtl)} onClick={() => setRtl(true)} aria-pressed={rtl}>
          RTL
        </button>
        <span className="mx-1 h-4 w-px bg-fd-border" />
        <select
          aria-label="Brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="rounded-md border bg-transparent px-1.5 py-1 text-xs text-fd-muted-foreground"
        >
          {BRANDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <a href={src} target="_blank" rel="noreferrer" className={`${button} text-fd-muted-foreground hover:text-fd-foreground`}>
          Open ↗
        </a>
      </div>
      <iframe ref={frame} key={src} src={src} title={`${title} preview`} loading="lazy" className="block w-full" style={{ height }} />
    </div>
  );
}
