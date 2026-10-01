import { Bdi, DateTime, isolate, Kbd, Ltr, Num, ProductMark, Status, formatNumber, formatDateRange } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

const meta = {
  title: "Foundations/Arabic & bidi",
  parameters: { layout: "fullscreen" },
  // Num and DateTime format in the provider's locale, so the test runs in Arabic whatever the toolbar says.
  globals: { locale: "ar" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const TODAY = new Date(2026, 8, 29, 14, 5);
const USD = { style: "currency", currency: "USD", maximumFractionDigits: 0 } as const;

interface Case {
  value: string;
  /** Nasaq: the primitive that isolates the value. */
  nasaq: ReactNode;
  /** The same sentence as a plain string, no isolation. */
  plain: ReactNode;
  /** Does the plain string render in the wrong order? Measured in Chromium, not assumed. */
  breaks: boolean;
  note: string;
}

/**
 * Arabic sentences carrying the values products actually show. Each row renders the sentence with the
 * Nasaq primitive and as a plain string, so a regression in either shows up side by side.
 */
function useCases(): Case[] {
  // The raw Intl output, which is what a product gets without Num.
  const intlUsd = new Intl.NumberFormat("ar-u-nu-latn", USD).format(48210);
  return [
    {
      value: "$48,210 (Arabic locale)",
      nasaq: <>بلغت الإيرادات <Num value={48210} format={USD} /> هذا الشهر.</>,
      plain: `بلغت الإيرادات ${intlUsd} هذا الشهر.`,
      breaks: true,
      note: "Intl writes \"48,210 US$\"; the neutral $ drifts past US in RTL. Num isolates the Latin symbol.",
    },
    {
      value: "$48,210 (typed)",
      nasaq: <>بلغت الإيرادات <Ltr>$48,210</Ltr> هذا الشهر.</>,
      plain: "بلغت الإيرادات $48,210 هذا الشهر.",
      breaks: true,
      note: "After Arabic letters the digits count as Arabic numbers (UBA W2), so $ no longer binds to them and lands after the figure: 48,210$.",
    },
    {
      value: "SAR · USD · EUR",
      nasaq: (
        <>
          <Num value={48210.5} format={{ style: "currency", currency: "SAR" }} /> ·{" "}
          <Num value={1200} format={{ style: "currency", currency: "USD" }} /> ·{" "}
          <Num value={980} format={{ style: "currency", currency: "EUR" }} />
        </>
      ),
      plain: ["SAR", "USD", "EUR"].map((c, i) => new Intl.NumberFormat("ar-u-nu-latn", { style: "currency", currency: c }).format([48210.5, 1200, 980][i]!)).join(" · "),
      breaks: false,
      note: "Arabic symbols (ر.س.، ج.م.) and € carry their own direction.",
    },
    {
      value: "-4.1%",
      nasaq: <>انخفضت الساعات <Num value={-0.041} format={{ style: "percent", maximumFractionDigits: 1 }} /> عن الشهر الماضي.</>,
      plain: "انخفضت الساعات -4.1% عن الشهر الماضي.",
      breaks: true,
      note: "A bare minus is neutral and jumps to the other side of the figure.",
    },
    {
      value: "MH-728",
      nasaq: <>نُقلت المهمة <Ltr>MH-728</Ltr> إلى المراجعة.</>,
      plain: "نُقلت المهمة MH-728 إلى المراجعة.",
      breaks: false,
      note: "Letters first, so the key holds together. Isolate anyway: the next case shows why.",
    },
    {
      value: "MH-728 opens a sentence",
      nasaq: <><Ltr>MH-728</Ltr> متأخرة يومين (<Ltr>412h</Ltr> مسجلة).</>,
      plain: "MH-728 متأخرة يومين (412h مسجلة).",
      breaks: false,
      note: "Fine in an RTL block. In a dir=auto block (user content) the first letter M would flip the whole line to LTR.",
    },
    {
      value: "412h",
      nasaq: <>سجّل الفريق <Num value={412} format={{ style: "unit", unit: "hour", unitDisplay: "long" }} /> هذا الشهر.</>,
      plain: "سجّل الفريق 412h هذا الشهر.",
      breaks: false,
      note: "Holds, but \"h\" is English. In Arabic UI format the unit: 412 ساعة.",
    },
    {
      value: "Ctrl K (keys)",
      nasaq: (
        <>
          اضغط{" "}
          <Ltr className="inline-flex gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </Ltr>{" "}
          للبحث.
        </>
      ),
      plain: (
        <>
          اضغط <Kbd>Ctrl</Kbd> <Kbd>K</Kbd> للبحث.
        </>
      ),
      breaks: true,
      note: "Each Kbd is its own isolate, so two in a row read right-to-left: K Ctrl. Group the chord in one Ltr.",
    },
    {
      value: "⌘K (string)",
      nasaq: `اضغط ${isolate("⌘K", "ltr")} للبحث.`,
      plain: "اضغط ⌘K للبحث.",
      breaks: true,
      note: "⌘ is a neutral symbol. In tooltips, toasts and aria labels use isolate(text, \"ltr\").",
    },
    {
      value: "Date",
      nasaq: <>تاريخ الاستحقاق <DateTime value={TODAY} format={{ dateStyle: "long" }} /> الساعة <DateTime value={TODAY} format={{ timeStyle: "short" }} />.</>,
      plain: `تاريخ الاستحقاق ${TODAY.toLocaleDateString("ar-SA", { dateStyle: "long" })}.`,
      breaks: true,
      note: "Order is fine, but plain Intl for ar-SA and ar-EG switches to ٠١٢ digits (plain \"ar\" does not). DateTime keeps Western digits for every Arabic locale.",
    },
    {
      value: "Short date · range · ISO",
      nasaq: (
        <>
          <DateTime value={TODAY} format={{ dateStyle: "short" }} /> ·{" "}
          {formatDateRange(new Date(2026, 8, 1), TODAY, "ar", { month: "long", day: "numeric" })} · <Ltr>2026-09-29</Ltr>
        </>
      ),
      plain: `${new Intl.DateTimeFormat("ar-u-nu-latn", { dateStyle: "short" }).format(TODAY)} · 2026-09-29`,
      breaks: false,
      note: "Intl already marks Arabic dates (29/9/2026 reads right to left). ISO dates are codes: Ltr.",
    },
    {
      value: "Relative time",
      nasaq: <>عُدّلت <DateTime value={new Date(Date.now() - 3 * 3_600_000)} relative />.</>,
      plain: "عُدّلت قبل 3 ساعات.",
      breaks: false,
      note: "DateTime relative puts the absolute date in the tooltip and a machine-readable dateTime on <time>.",
    },
    {
      value: "English product names",
      nasaq: (
        <>
          افتح <Bdi>Health Debug</Bdi> من متجر <Bdi>CircleXO App Store</Bdi> وثبّت <Bdi>Mahaam</Bdi>.
        </>
      ),
      plain: "افتح Health Debug من متجر CircleXO App Store وثبّت Mahaam.",
      breaks: false,
      note: "Plain Latin words are strong LTR and keep their order.",
    },
    {
      value: "Name + count in brackets",
      nasaq: <>لديك <Bdi>Mahaam (3)</Bdi> إشعارات جديدة.</>,
      plain: "لديك Mahaam (3) إشعارات جديدة.",
      breaks: false,
      note: "Holds: the bracket-pair rule (UBA N0) resolves both brackets together. Bdi still keeps a user name from merging with what follows.",
    },
    {
      value: "C++ · .NET · #nasaq · @fadymondy",
      nasaq: (
        <>
          الوسوم: <Ltr>C++</Ltr>، <Ltr>.NET</Ltr>، <Ltr>#nasaq</Ltr>، <Ltr>@fadymondy</Ltr>
        </>
      ),
      plain: "الوسوم: C++، .NET، #nasaq، @fadymondy",
      breaks: true,
      note: "The Arabic comma is a number separator (CS), so the tags fuse into one LTR run and read backwards: the first tag lands last.",
    },
    {
      value: "Arabic name inside English",
      nasaq: (
        <span dir="ltr" lang="en">
          Assigned to <Bdi>فادي موندي</Bdi> 3 tasks
        </span>
      ),
      plain: (
        <span dir="ltr" lang="en">
          Assigned to فادي موندي 3 tasks
        </span>
      ),
      breaks: true,
      note: "The reverse case: the 3 joins the Arabic run and moves before the name. Bdi around user names.",
    },
  ];
}

function Verdict({ breaks }: { breaks: boolean }) {
  return breaks ? <Status tone="danger">Breaks</Status> : <Status tone="success">Holds</Status>;
}

/** Every value from the brief inside Arabic text. Left: Nasaq primitive. Right: the plain string. */
export const MixedValues: Story = {
  render: function Render() {
    const cases = useCases();
    return (
      <div className="flex flex-col gap-4 p-6" dir="ltr" lang="en">
        <p className="max-w-3xl text-body-sm text-muted-foreground">
          Each value inside an Arabic sentence (<code>dir="rtl"</code>), rendered with the Nasaq primitive and as a
          plain string. Verdicts are for the plain string, measured in Chromium. The Nasaq column must read correctly
          in every row.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[68rem] border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-border text-start text-caption text-muted-foreground">
                <th className="w-48 py-2 pe-4 text-start font-medium">Value</th>
                <th className="py-2 pe-4 text-start font-medium">Nasaq</th>
                <th className="py-2 pe-4 text-start font-medium">Plain string</th>
                <th className="w-72 py-2 text-start font-medium">Why</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.value} className="border-b border-border align-top">
                  <td className="py-3 pe-4 font-mono text-caption">{c.value}</td>
                  <td className="whitespace-nowrap py-3 pe-4" dir="rtl" lang="ar" data-case="nasaq">
                    {c.nasaq}
                  </td>
                  <td className="py-3 pe-4" dir="rtl" lang="ar">
                    <div className="flex flex-col items-start gap-1">
                      <span className="whitespace-nowrap" data-case="plain">{c.plain}</span>
                      <span dir="ltr" lang="en">
                        <Verdict breaks={c.breaks} />
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-caption text-muted-foreground">{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  },
};

/** The same values in the places they really appear: a KPI, a list row, a toast-style string, a truncated title. */
export const InContext: Story = {
  render: function Render() {
    const title = "CircleXO App Store: review the Q3 invoices for Health Debug";
    return (
      <div dir="rtl" lang="ar" className="grid max-w-3xl gap-6 p-6">
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
          <span className="text-caption text-muted-foreground">الإيرادات</span>
          <span className="text-h2">
            <Num value={48210} format={USD} />
          </span>
          <span className="text-caption text-muted-foreground">
            <Num value={0.124} format={{ style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }} /> عن{" "}
            {formatDateRange(new Date(2026, 7, 1), new Date(2026, 7, 31), "ar", { month: "long", day: "numeric" })}
          </span>
        </div>

        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {[
            { key: "MH-728", brand: "mahaam", title: "مراجعة فواتير CircleXO", hours: 412 },
            { key: "MH-731", brand: "zekra", title: "Sync Zekra memory (v2.4)", hours: 36.5 },
            { key: "MH-740", brand: "health-debug", title: title, hours: 8 },
          ].map((row) => (
            <li key={row.key} className="flex items-center gap-3 px-4 py-2.5 text-body-sm">
              <ProductMark brand={row.brand} size={16} title="" />
              <Ltr className="font-mono text-caption text-muted-foreground">{row.key}</Ltr>
              {/* User content: its own direction, truncated at its own end. */}
              <span dir="auto" className="min-w-0 flex-1 truncate text-start">
                {row.title}
              </span>
              <Num value={row.hours} format={{ style: "unit", unit: "hour", unitDisplay: "short" }} className="text-muted-foreground" />
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 text-body-sm">
          <span className="text-caption text-muted-foreground" dir="ltr" lang="en">
            Truncated English title in an Arabic row. Top: plain (cuts the start). Bottom: dir="auto" (cuts the end).
          </span>
          <span className="block w-72 truncate rounded border border-border px-2 py-1">{title}</span>
          <span dir="auto" className="block w-72 truncate rounded border border-border px-2 py-1 text-start">
            {title}
          </span>
        </div>

        <div className="flex flex-col gap-1 text-body-sm">
          <span className="text-caption text-muted-foreground" dir="ltr" lang="en">
            Strings (toasts, titles, aria-label) built with formatNumber and isolate:
          </span>
          <span>{`تم إنشاء ${isolate("MH-728", "ltr")} بقيمة ${formatNumber(48210, "ar", USD)}، اضغط ${isolate("⌘K", "ltr")} للبحث.`}</span>
        </div>
      </div>
    );
  },
};
