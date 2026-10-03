import { ArrowUpRight } from "lucide-react";
import { storeUrl, type Template } from "@/lib/templates";

/** Template cards with the real Studio screenshots (light and dark); each opens the template in the CircleXO store. */
export function TemplateCards({ list, placement }: { list: Template[]; placement: string }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((t) => (
        <li key={t.id}>
          <a
            href={storeUrl(t.id, placement)}
            target="_blank"
            rel="noopener"
            className="group flex h-full flex-col overflow-hidden rounded-xl border bg-fd-card transition-colors hover:border-fd-primary/50"
          >
            <div className="aspect-[16/10] overflow-hidden border-b bg-fd-muted">
              <img
                src={t.thumbnail}
                alt={`${t.name} website template, home page`}
                width={1440}
                height={900}
                loading="lazy"
                decoding="async"
                className={`size-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] ${t.darkThumbnail ? "dark:hidden" : ""}`}
              />
              {t.darkThumbnail ? (
                <img
                  src={t.darkThumbnail}
                  alt={`${t.name} website template, home page in dark mode`}
                  width={1440}
                  height={900}
                  loading="lazy"
                  decoding="async"
                  className="hidden size-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] dark:block"
                />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{t.name}</span>
                <span className="rounded-full border px-2 py-0.5 text-xs text-fd-muted-foreground">{t.free ? "Free" : "Paid"}</span>
              </div>
              <span className="line-clamp-3 text-sm text-fd-muted-foreground">{t.description}</span>
              <span className="mt-auto flex items-center gap-1 pt-2 text-sm font-medium text-fd-primary">
                Get it on CircleXO <ArrowUpRight className="size-4" aria-hidden />
              </span>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
