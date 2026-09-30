/*
 * Shared demo data for the W3 batch: appearance pickers, time fields, text effects and marketing sections.
 * Fake data only; no product logos are drawn here (marquee items are plain names).
 */
import type { AppearanceTheme, AppearanceWallpaper, SessionEvent, Testimonial } from "@nasaq/web";
import { BarChart3, Bell, CalendarDays, Globe2, Layers, Lock, type LucideIcon, Users, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { useAr } from "./_s-demo";

export { useAr };

/** A fixed moment so clocks in stories do not drift between screenshots. */
export const W3_NOW = new Date("2026-09-30T09:30:00Z");

export function useThemes(): AppearanceTheme[] {
  const ar = useAr();
  return [
    { id: "paper", label: ar ? "ورق" : "Paper", description: ar ? "فاتح ودافئ" : "Light and warm", mode: "light", swatches: ["var(--nq-surface)", "var(--nq-surface-soft)", "var(--nq-fg)", "var(--nq-brand)"] },
    { id: "ink", label: ar ? "حبر" : "Ink", description: ar ? "داكن وهادئ" : "Dark and calm", mode: "dark", swatches: ["var(--nq-fg)", "var(--nq-fg-muted)", "var(--nq-surface)", "var(--nq-brand)"] },
    { id: "ocean", label: ar ? "محيط" : "Ocean", description: ar ? "أزرق بارد" : "Cool blue", mode: "light", swatches: ["var(--nq-tag-blue-soft)", "var(--nq-surface)", "var(--nq-fg)", "var(--nq-tag-blue)"] },
    { id: "forest", label: ar ? "غابة" : "Forest", description: ar ? "أخضر عميق" : "Deep green", mode: "dark", swatches: ["var(--nq-tag-green)", "var(--nq-tag-green-soft)", "var(--nq-fg)", "var(--nq-tag-amber)"] },
    { id: "dusk", label: ar ? "غسق" : "Dusk", description: ar ? "بنفسجي ناعم" : "Soft purple", mode: "dark", swatches: ["var(--nq-tag-violet)", "var(--nq-tag-violet-soft)", "var(--nq-surface)", "var(--nq-tag-pink)"] },
    { id: "sand", label: ar ? "رمل" : "Sand", description: ar ? "دافئ ومحايد" : "Warm neutral", mode: "light", swatches: ["var(--nq-tag-amber-soft)", "var(--nq-surface-soft)", "var(--nq-fg)", "var(--nq-tag-orange)"] },
  ];
}

export function useWallpapers(): AppearanceWallpaper[] {
  const ar = useAr();
  const g = ar ? "تدرجات" : "Gradients";
  const c = ar ? "ألوان" : "Colours";
  return [
    { id: "dawn", label: ar ? "فجر" : "Dawn", group: g, background: "linear-gradient(135deg, var(--nq-tag-orange-soft), var(--nq-tag-pink-soft))" },
    { id: "lagoon", label: ar ? "بحيرة" : "Lagoon", group: g, background: "linear-gradient(135deg, var(--nq-tag-blue-soft), var(--nq-tag-green-soft))" },
    { id: "violet", label: ar ? "بنفسجي" : "Violet", group: g, background: "linear-gradient(135deg, var(--nq-tag-violet-soft), var(--nq-tag-blue-soft))" },
    { id: "meadow", label: ar ? "مرج" : "Meadow", group: g, background: "linear-gradient(160deg, var(--nq-tag-green-soft), var(--nq-tag-amber-soft))" },
    { id: "soft", label: ar ? "رمادي ناعم" : "Soft grey", group: c, background: "var(--nq-surface-soft)" },
    { id: "brand", label: ar ? "لون العلامة" : "Brand", group: c, background: "var(--nq-brand)" },
    { id: "blue", label: ar ? "أزرق" : "Blue", group: c, background: "var(--nq-tag-blue)" },
  ];
}

export function useSessionEvents(): SessionEvent[] {
  const ar = useAr();
  return ar
    ? [
        { role: "user", text: "أضف مظهراً داكناً إلى صفحة الإعدادات وتأكد أنه يُحفظ." },
        { role: "status", text: "أقرأ ملفات المشروع" },
        { role: "tool", title: "قراءة ملف", text: "settings/appearance.tsx" },
        { role: "assistant", text: "وجدت مبدّل المظهر. سأضيف خيار الداكن وأحفظه في تفضيلات المستخدم." },
        { role: "tool", title: "تعديل ملف", text: "settings/appearance.tsx (+24 -3)" },
        { role: "tool", title: "تشغيل الاختبارات", text: "12 ناجحاً" },
        { role: "assistant", text: "تم. المظهر الداكن يعمل ويُحفظ بين الجلسات، وأضفت اختباراً له." },
      ]
    : [
        { role: "user", text: "Add a dark theme to the settings page and make sure it is saved." },
        { role: "status", text: "Reading the project files" },
        { role: "tool", title: "Read file", text: "settings/appearance.tsx" },
        { role: "assistant", text: "Found the theme switch. I will add a dark option and store it in the user preferences." },
        { role: "tool", title: "Edit file", text: "settings/appearance.tsx (+24 -3)" },
        { role: "tool", title: "Run tests", text: "12 passed" },
        { role: "assistant", text: "Done. Dark mode works and is remembered between sessions, and I added a test for it." },
      ];
}

export function useTestimonials(): Testimonial[] {
  const ar = useAr();
  return ar
    ? [
        { id: "1", name: "ليلى المطيري", role: "مديرة عمليات", company: "سحاب", rating: 5, quote: "حجزنا كل المقاعد في يوم واحد. لم نحتج إلى شرح الأداة لأحد." },
        { id: "2", name: "عمر خليل", role: "مؤسس", company: "استوديو نور", rating: 5, quote: "الصفحة بالعربية تبدو مصمَّمة لها من البداية، لا مترجمة." },
        { id: "3", name: "سارة الحربي", role: "مصممة", company: "خطوط", rating: 4, quote: "الإعداد استغرق عشر دقائق، والدعم ردّ قبل أن أنهي قهوتي." },
      ]
    : [
        { id: "1", name: "Layla Almutairi", role: "Operations lead", company: "Sahab", rating: 5, quote: "We filled every seat in a day. Nobody needed the tool explained." },
        { id: "2", name: "Omar Khalil", role: "Founder", company: "Noor Studio", rating: 5, quote: "The Arabic page looks designed for Arabic, not translated into it." },
        { id: "3", name: "Sara Alharbi", role: "Designer", company: "Khutoot", rating: 4, quote: "Setup took ten minutes and support replied before my coffee cooled." },
      ];
}

export function useFeatures(): { icon: ReactNode; title: string; description: string }[] {
  const ar = useAr();
  const icons: LucideIcon[] = [Zap, Users, CalendarDays, Bell, Lock, Globe2, BarChart3, Layers];
  const en = [
    ["Fast by default", "Pages load at once and stay responsive on slow phones."],
    ["Made for teams", "Invite people, share views and see who changed what."],
    ["Plans and calendars", "Schedule once and every time zone sees its own time."],
    ["Quiet alerts", "Only the things that need you, when they need you."],
    ["Private by design", "Your data stays yours, with access you can review."],
    ["Two languages", "English and Arabic, laid out properly in both directions."],
  ];
  const arr = [
    ["سريع افتراضياً", "تُفتح الصفحات فوراً وتبقى سلسة على الهواتف البطيئة."],
    ["للفرق", "ادعُ الأشخاص وشارك العروض وتابع من غيّر ماذا."],
    ["خطط وتقاويم", "جدول مرة واحدة وسيرى كل منطقة زمنية وقتها."],
    ["تنبيهات هادئة", "فقط ما يحتاجك، عندما يحتاجك."],
    ["خصوصية أولاً", "بياناتك لك، مع صلاحيات يمكنك مراجعتها."],
    ["لغتان", "العربية والإنجليزية بتخطيط صحيح في الاتجاهين."],
  ];
  return (ar ? arr : en).map(([title, description], i) => {
    const Icon = icons[i] ?? Zap;
    return { icon: <Icon />, title: title ?? "", description: description ?? "" };
  });
}

/** A small stand-in for an app screen, built from tokens so it themes and mirrors. */
export function MockApp({ height = 260 }: { height?: number }) {
  const ar = useAr();
  const rows = ar ? ["الطاولة 12", "الطاولة 07", "الطاولة 21", "الطاولة 03"] : ["Table 12", "Table 07", "Table 21", "Table 03"];
  const stats = [
    ["48", ar ? "حجوزات" : "Bookings"],
    ["92%", ar ? "إشغال" : "Filled"],
    ["6", ar ? "انتظار" : "Waiting"],
  ];
  return (
    <div className="flex bg-background text-start" style={{ height }}>
      <div className="hidden w-1/4 flex-col gap-2 border-border border-e bg-nq-surface-soft p-3 sm:flex">
        <div className="h-3 w-2/3 rounded-full bg-nq-brand" />
        {[70, 55, 60, 45].map((w) => (
          <div key={w} className="h-2 rounded-full bg-nq-line-strong" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <div className="text-label text-foreground">{ar ? "الحجوزات اليوم" : "Today bookings"}</div>
          <div className="rounded-control bg-nq-brand px-2 py-1 text-caption text-primary-foreground">{ar ? "حجز جديد" : "New booking"}</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {stats.map(([n, l]) => (
            <div key={l} className="rounded-control border border-border bg-card p-2">
              <div dir="ltr" className="text-h3 text-foreground tabular-nums">
                {n}
              </div>
              <div className="text-caption text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {rows.map((r, i) => (
            <div key={r} className="flex items-center justify-between rounded-control border border-border bg-card px-2.5 py-1.5 text-caption">
              <span className="text-foreground">{r}</span>
              <span className={i % 2 ? "text-muted-foreground" : "text-nq-success-text"}>{i % 2 ? (ar ? "بانتظار" : "Waiting") : ar ? "مؤكد" : "Confirmed"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const LOGO_NAMES = ["Sahab", "Noor Studio", "Khutoot", "Baraka", "Watar", "Mizan", "Rimal"];
