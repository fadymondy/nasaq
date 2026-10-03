import { Input, type TestRunHandlers, TestRunStream } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr } from "./_auth";

const meta = { title: "Components/Workflow/Test Run Stream", component: TestRunStream, parameters: { layout: "padded" } } satisfies Meta<typeof TestRunStream>;
export default meta;
type Story = StoryObj;

type Event = { at: number; send: (on: TestRunHandlers) => void };

/** Plays a scripted stream, like events arriving from the server, and stops when the signal aborts. */
function play(events: Event[], on: TestRunHandlers, signal: AbortSignal) {
  const timers = events.map((e) => setTimeout(() => e.send(on), e.at));
  signal.addEventListener("abort", () => timers.forEach(clearTimeout));
}

function script(ar: boolean, max: number, fail: boolean): Event[] {
  const L = (en: string, a: string) => (ar ? a : en);
  const saved = Array.from({ length: max }, (_, i) => ({
    at: 3600 + i * 250,
    send: (on: TestRunHandlers) =>
      on.result({
        id: `item-${i}`,
        title: L(["Port of Jeddah extends night shifts", "New bus lanes open downtown", "Rainfall expected over the weekend", "City council approves park budget", "Airport adds two gates"][i % 5]!, ["ميناء جدة يمدد المناوبات الليلية", "افتتاح مسارات حافلات جديدة في وسط المدينة", "توقعات بأمطار في عطلة نهاية الأسبوع", "المجلس البلدي يقر ميزانية الحديقة", "المطار يضيف بوابتين"][i % 5]!),
        url: `https://example.com/news/${1040 + i}`,
        meta: [new Date(Date.UTC(2026, 8, 30 - i, 8, 15)).toLocaleString(ar ? "ar" : "en", { dateStyle: "medium", timeStyle: "short" }), ar ? "عربي" : "en", `#${(0x9a3f10 + i * 4099).toString(16)}`],
        body: L("A short preview of the article text as the source returned it, cut to three lines in the list so the page stays scannable.", "معاينة قصيرة لنص المقال كما أعاده المصدر، مقصوصة إلى ثلاثة أسطر حتى تبقى الصفحة سهلة التصفح."),
        raw: { id: 1040 + i, source: "rss", lang: ar ? "ar" : "en", tags: ["city", "transport"] },
      }),
  }));
  const fetch = L("Fetch feed", "جلب الموجز");
  const parse = L("Parse items", "تحليل العناصر");
  const dedupe = L("Remove duplicates", "إزالة التكرار");
  const translate = L("Translate", "الترجمة");
  const save = L("Save", "الحفظ");
  if (fail)
    return [
      { at: 200, send: (on) => on.step({ id: "fetch", name: fetch, status: "running", detail: "https://example.com/rss" }) },
      { at: 1400, send: (on) => on.step({ id: "fetch", name: fetch, status: "ok", count: 24, durationMs: 1180 }) },
      { at: 1500, send: (on) => on.step({ id: "parse", name: parse, status: "running" }) },
      { at: 2300, send: (on) => on.step({ id: "parse", name: parse, status: "error", durationMs: 790, error: L("Item 7 has no title or link.", "العنصر 7 بلا عنوان أو رابط.") }) },
      { at: 2400, send: (on) => on.fail(L("The feed could not be parsed. Check the source settings and try again.", "تعذر تحليل الموجز. راجع إعدادات المصدر ثم أعد المحاولة.")) },
    ];
  return [
    { at: 200, send: (on) => on.step({ id: "fetch", name: fetch, status: "running", detail: "https://example.com/rss" }) },
    { at: 1400, send: (on) => on.step({ id: "fetch", name: fetch, status: "ok", count: 24, durationMs: 1180, detail: "https://example.com/rss" }) },
    { at: 1500, send: (on) => on.step({ id: "parse", name: parse, status: "running" }) },
    { at: 1900, send: (on) => on.step({ id: "parse", name: parse, status: "ok", count: 24, durationMs: 380 }) },
    { at: 2000, send: (on) => on.step({ id: "dedupe", name: dedupe, status: "ok", count: 17, durationMs: 40, detail: L("7 already saved", "7 محفوظة مسبقًا") }) },
    { at: 2100, send: (on) => on.step({ id: "translate", name: translate, status: "running", detail: L("0 of 17", "0 من 17") }) },
    { at: 2700, send: (on) => on.step({ id: "translate", name: translate, status: "running", detail: L("9 of 17", "9 من 17") }) },
    { at: 3300, send: (on) => on.step({ id: "translate", name: translate, status: "ok", count: 17, durationMs: 1190 }) },
    { at: 3400, send: (on) => on.step({ id: "save", name: save, status: "running", detail: L(`Keeping the first ${max}`, `الاحتفاظ بأول ${max}`) }) },
    ...saved,
    { at: 3700 + max * 250, send: (on) => on.step({ id: "save", name: save, status: "ok", count: max, durationMs: 300 + max * 250 }) },
    { at: 3800 + max * 250, send: (on) => on.done() },
  ];
}

function Demo({ fail = false }: { fail?: boolean }) {
  const ar = useAr();
  const [max, setMax] = useState("3");
  return (
    <div className="max-w-3xl">
      <TestRunStream
        controls={
          <label className="flex items-center gap-2 text-body-sm text-muted-foreground">
            {ar ? "الحد الأقصى" : "Keep up to"}
            <Input ltr type="number" min={1} max={10} value={max} onChange={(e) => setMax(e.currentTarget.value)} className="w-20" />
          </label>
        }
        run={(on, signal) => play(script(ar, Math.min(10, Math.max(1, Number(max) || 1)), fail), on, signal)}
      />
    </div>
  );
}

/** A source test: steps stream in and update in place, then the saved items. Stop part-way to see skipped steps. */
export const Default: Story = { render: () => <Demo /> };
/** A step fails and the run ends with a reason. */
export const Failing: Story = { render: () => <Demo fail /> };
export const Arabic: Story = { ...Default, globals: { locale: "ar" } };
