// nqSeoPreview: a Google result (desktop and mobile) and Open Graph, X, WhatsApp and LinkedIn share cards for one page, with the title and
// description length meters. The markup is the React SeoPreview's (see the Blade component); the state and the derived text live here.
//
//   <div x-data="nqSeoPreview({ title: '…', description: '…', url: 'https://nasaq.dev/blog/rtl' }, { noTitle: '…', … })"> … </div>
//
// The meta is plain data: title, description, url, siteName, favicon, image, breadcrumb. `device` is an array ("desktop" | "mobile") so a toggle group can drive it.
// Editing fields write the same state and dispatch a bubbling `nq-seo-preview-change` with the whole meta as detail.

import { breadcrumbFor, hostOf, lengthMeter, truncateAt, type SeoField } from "./seo-preview-logic";
import type { Magics, Register } from "./types";

interface Meta {
  title?: string;
  description?: string;
  url?: string;
  siteName?: string;
  favicon?: string;
  image?: string;
  breadcrumb?: string[];
}
interface Words {
  noTitle: string;
  noDescription: string;
  siteFallback: string;
  length: string;
  empty: string;
  short: string;
  good: string;
  longOne: string;
  longMany: string;
}

const fill = (tpl: string, vars: Record<string, number>) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

export const seoPreview: Register = (Alpine) => {
  Alpine.data("nqSeoPreview", (meta: Meta = {}, words: Partial<Words> = {}) => ({
    title: meta.title ?? "",
    description: meta.description ?? "",
    url: meta.url ?? "",
    siteName: meta.siteName ?? "",
    favicon: meta.favicon ?? "",
    image: meta.image ?? "",
    breadcrumb: meta.breadcrumb ?? ([] as string[]),
    device: ["desktop"] as string[],
    words: words as Words,

    get mobile(): boolean {
      return this.device[0] === "mobile";
    },
    get host(): string {
      return hostOf(this.url);
    },
    get site(): string {
      return this.siteName || this.host || this.words.siteFallback;
    },
    get crumbs(): string[] {
      return breadcrumbFor(this.url, this.breadcrumb);
    },
    get firstLetter(): string {
      return [...(this.siteName || this.host)][0] ?? "";
    },
    get shownTitle(): string {
      return this.title.trim() || this.words.noTitle;
    },
    get shownDescription(): string {
      return this.description.trim() || this.words.noDescription;
    },
    get googleTitle(): string {
      return this.title.trim() ? truncateAt(this.title, this.mobile ? 70 : 60) : this.words.noTitle;
    },
    get googleDescription(): string {
      return this.description.trim() ? truncateAt(this.description, this.mobile ? 120 : 160) : this.words.noDescription;
    },
    meter(field: SeoField) {
      const m = lengthMeter(field, field === "title" ? this.title : this.description);
      const verdict = m.status === "long" ? fill(m.over === 1 ? this.words.longOne : this.words.longMany, { n: m.over }) : this.words[m.status];
      const tone = { empty: "neutral", short: "warning", good: "success", long: "danger" }[m.status];
      return { ...m, verdict, tone, text: fill(this.words.length, { n: m.length, max: m.max }), percent: Math.round(m.fraction * 10000) / 100 };
    },
    get titleMeter() {
      return this.meter("title");
    },
    get descMeter() {
      return this.meter("description");
    },
    changed(this: Magics & Record<string, unknown>) {
      this.$dispatch("nq-seo-preview-change", {
        title: this.title,
        description: this.description,
        url: this.url,
        siteName: this.siteName,
        favicon: this.favicon,
        image: this.image,
        breadcrumb: this.breadcrumb,
      });
    },
  }));
};
