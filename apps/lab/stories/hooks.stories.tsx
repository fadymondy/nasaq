import { Button, Input, Spinner, useDebounce, useInfiniteScroll, useIsMobile, useMediaQuery } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr, wait } from "./_lifecycle-demo";

const meta = { title: "Components/Utilities/Hooks", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const CITIES = ["Cairo", "Alexandria", "Riyadh", "Jeddah", "Dubai", "Abu Dhabi", "Amman", "Casablanca", "Doha", "Kuwait City", "Muscat", "Beirut"];

/** useDebounce: the filter runs 300 ms after typing stops. */
export const Debounce: Story = {
  render: () => {
    const ar = useAr();
    const [q, setQ] = useState("");
    const debounced = useDebounce(q, 300);
    const hits = CITIES.filter((c) => c.toLowerCase().includes(debounced.toLowerCase()));
    return (
      <div className="flex max-w-xs flex-col gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "ابحث عن مدينة" : "Search a city"} aria-label={ar ? "بحث" : "Search"} />
        <p className="text-caption text-muted-foreground">
          {ar ? "النص المؤجّل:" : "Debounced:"} <span className="text-foreground">“{debounced}”</span>
        </p>
        <ul className="text-body-sm">
          {hits.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
    );
  },
};

/** useIsMobile and useMediaQuery: resize the canvas. */
export const MediaQueries: Story = {
  render: () => {
    const ar = useAr();
    const mobile = useIsMobile();
    const dark = useMediaQuery("(prefers-color-scheme: dark)");
    const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
    const rows: [string, boolean][] = [
      [ar ? "جوال (أقل من 768)" : "Mobile (under 768px)", mobile],
      [ar ? "النظام داكن" : "System dark", dark],
      [ar ? "تقليل الحركة" : "Reduced motion", reduced],
    ];
    return (
      <div className="max-w-sm divide-y divide-border rounded-card border border-border px-3 text-body-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-6 py-2">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-mono">{String(v)}</span>
          </div>
        ))}
      </div>
    );
  },
};

/** useInfiniteScroll: the next page loads as the sentinel nears the bottom of the box. */
export const InfiniteScroll: Story = {
  render: () => {
    const ar = useAr();
    const [items, setItems] = useState(() => Array.from({ length: 12 }, (_, i) => i + 1));
    const [loading, setLoading] = useState(false);
    const [root, setRoot] = useState<HTMLDivElement | null>(null);
    const hasMore = items.length < 60;
    const more = async () => {
      setLoading(true);
      await wait(500);
      setItems((x) => [...x, ...Array.from({ length: 12 }, (_, i) => x.length + i + 1)]);
      setLoading(false);
    };
    const sentinel = useInfiniteScroll({ onLoadMore: more, hasMore, loading, root, rootMargin: "80px" });
    return (
      <div ref={setRoot} className="h-80 max-w-sm overflow-auto rounded-card border border-border">
        <ul>
          {items.map((n) => (
            <li key={n} className="border-b border-border px-3 py-2 text-body-sm">
              {ar ? `عنصر ${n}` : `Item ${n}`}
            </li>
          ))}
        </ul>
        <div ref={sentinel} className="flex justify-center p-3">
          {loading ? (
            <Spinner />
          ) : hasMore ? (
            <Button size="sm" onClick={more}>
              {ar ? "تحميل المزيد" : "Load more"}
            </Button>
          ) : (
            <span className="text-caption text-muted-foreground">{ar ? "لا مزيد" : "That's everything"}</span>
          )}
        </div>
      </div>
    );
  },
};

export const Arabic: Story = { ...Debounce, globals: { locale: "ar" } };
