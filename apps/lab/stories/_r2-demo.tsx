import type { InvoiceSummary, PortalActivity, PortalProject, PortalRequest, PortalTask, PortalWeek, SocialAccount, SocialMetricsRow, SocialPost, Testimonial } from "@nasaq/web";
import { useNasaq } from "@nasaq/web";

export const wait = (ms = 700) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export const useAr = () => useNasaq().locale.startsWith("ar");

/* ------------------------------------------------------------------ social composer */

export const socialAccounts: SocialAccount[] = [
  { id: "x1", platform: "x", name: "@nasaq_ui" },
  { id: "bs1", platform: "bluesky", name: "nasaq.bsky.social" },
  { id: "th1", platform: "threads", name: "@nasaq_ui" },
  { id: "li1", platform: "linkedin", name: "Nasaq Studio" },
  { id: "ig1", platform: "instagram", name: "@nasaq.studio" },
  { id: "tt1", platform: "tiktok", name: "@nasaq.studio" },
];

export const socialPost = (ar: boolean): SocialPost => ({
  body: ar
    ? "أطلقنا اليوم مكتبة نسق للواجهات: مكوّنات تدعم العربية من اليوم الأول. جرّبها هنا https://nasaq.example/launch #نسق #تصميم"
    : "Today we shipped Nasaq, a design system that treats Arabic as a first-class language. Try it here https://nasaq.example/launch #design #rtl",
  variants: {},
  accountIds: ["x1", "li1", "ig1"],
  media: [],
  scheduledAt: null,
});

export const socialMetrics = (ar: boolean): SocialMetricsRow[] => [
  { id: "m1", platform: "x", account: "@nasaq_ui", text: ar ? "أطلقنا اليوم مكتبة نسق للواجهات" : "Today we shipped Nasaq", status: "published", publishedAt: "2026-09-21T09:00:00", impressions: 18400, likes: 412, replies: 38, reposts: 96, clicks: 540 },
  { id: "m2", platform: "linkedin", account: "Nasaq Studio", text: ar ? "لماذا بنينا نسق: ثلاث دروس من العربية" : "Why we built Nasaq: three lessons from Arabic UI", status: "published", publishedAt: "2026-09-21T09:05:00", impressions: 9200, likes: 301, replies: 24, reposts: 41, clicks: 388 },
  { id: "m3", platform: "bluesky", account: "nasaq.bsky.social", text: ar ? "صفحة الأسعار الجديدة" : "The new pricing page", status: "published", publishedAt: "2026-09-18T12:30:00", impressions: 2100, likes: 88, replies: 9, reposts: 14, clicks: 60 },
  { id: "m4", platform: "instagram", account: "@nasaq.studio", text: ar ? "خلف الكواليس" : "Behind the scenes", status: "failed", publishedAt: null },
  { id: "m5", platform: "threads", account: "@nasaq_ui", text: ar ? "نصائح للكتابة من اليمين إلى اليسار" : "Tips for writing right to left", status: "queued", publishedAt: null },
];

/* ------------------------------------------------------------------ testimonials */

export const testimonialItems = (ar: boolean): Testimonial[] => [
  { id: "t1", name: ar ? "سارة القحطاني" : "Sara Alqahtani", role: ar ? "مديرة المنتج" : "Product lead", company: "Tamkeen", quote: ar ? "غيّرت نسق طريقة عملنا: واجهات عربية سليمة من أول يوم دون ترقيع." : "Nasaq changed how we work: proper Arabic interfaces from day one, no patching.", rating: 5, featured: true, date: "2026-09-02" },
  { id: "t2", name: "Daniel Ortiz", role: "CTO", company: "Northwind", quote: "We dropped three internal libraries. The table and form parts alone paid for the switch.", rating: 5, date: "2026-08-20" },
  { id: "t3", name: ar ? "خالد العتيبي" : "Khalid Alotaibi", role: ar ? "مطوّر" : "Developer", quote: ar ? "التوثيق واضح والمكوّنات تعمل بلوحة المفاتيح كما يجب." : "Clear docs, and everything works from the keyboard as it should.", rating: 4, date: "2026-08-11" },
  { id: "t4", name: "Mei Tanaka", company: "Lumen", quote: "Good defaults. I wished for more chart types, but the rest is solid.", rating: 4, date: "2026-07-30" },
  { id: "t5", name: ar ? "نورة الشمري" : "Noura Alshammari", role: ar ? "مصممة" : "Designer", company: "Studio Nour", quote: ar ? "أخيرًا نظام تصميم يحترم الاتجاه والأرقام العربية." : "Finally a design system that respects direction and Arabic digits.", rating: 5, date: "2026-07-12" },
];

/* ------------------------------------------------------------------ client portal */

export const portalProject = (ar: boolean): PortalProject => ({
  name: ar ? "منصة الحجز الجديدة" : "New booking platform",
  client: ar ? "شركة تمكين" : "Tamkeen Co.",
  summary: ar ? "إعادة بناء تجربة الحجز على الويب والجوال." : "Rebuilding the booking experience on web and mobile.",
  due: "2026-11-15",
});

export const portalTasks = (ar: boolean): PortalTask[] => [
  { id: "p1", title: ar ? "تصميم صفحة الحجز" : "Design the booking page", status: "done", assignee: ar ? "ليلى" : "Layla" },
  { id: "p2", title: ar ? "ربط بوابة الدفع" : "Connect the payment gateway", status: "done", assignee: "Omar" },
  { id: "p3", title: ar ? "رسائل التأكيد بالبريد" : "Confirmation emails", status: "done", assignee: ar ? "ليلى" : "Layla" },
  { id: "p4", title: ar ? "تقويم التوفر" : "Availability calendar", status: "review", assignee: "Omar" },
  { id: "p5", title: ar ? "نسخة الجوال" : "Mobile layout", status: "doing", assignee: ar ? "نورة" : "Noura" },
  { id: "p6", title: ar ? "الإشعارات" : "Notifications", status: "doing", assignee: ar ? "نورة" : "Noura" },
  { id: "p7", title: ar ? "لوحة التقارير" : "Reports dashboard", status: "todo" },
  { id: "p8", title: ar ? "تصدير البيانات" : "Data export", status: "todo" },
];

export const portalRequests = (ar: boolean): PortalRequest[] => [
  { id: "r1", title: ar ? "إضافة الدفع بأبل باي" : "Add Apple Pay", description: ar ? "نريد أن يدفع العملاء من الجوال بلمسة واحدة." : "We want customers to pay from their phone in one tap.", status: "pending", createdAt: "2026-09-26T10:00:00", by: ar ? "سارة" : "Sara" },
  { id: "r2", title: ar ? "تغيير لون الشعار في الفاتورة" : "Change the logo colour on invoices", status: "done", createdAt: "2026-09-12T08:30:00", by: ar ? "سارة" : "Sara", reply: ar ? "تم، ستظهر في الفاتورة القادمة." : "Done. It shows on the next invoice." },
  { id: "r3", title: ar ? "لوحة لكل فرع" : "A dashboard per branch", status: "declined", createdAt: "2026-08-30T14:00:00", by: "Daniel", reply: ar ? "خارج نطاق هذه المرحلة، ندرجه في المرحلة الثانية." : "Out of scope for this phase. We will plan it for phase two." },
];

export const portalWeeks: PortalWeek[] = [
  { week: "2026-08-03", hours: 22 },
  { week: "2026-08-10", hours: 30.5 },
  { week: "2026-08-17", hours: 26 },
  { week: "2026-08-24", hours: 34 },
  { week: "2026-08-31", hours: 28.5 },
  { week: "2026-09-07", hours: 18 },
  { week: "2026-09-14", hours: 31 },
  { week: "2026-09-21", hours: 24.5 },
];

export const portalInvoices: InvoiceSummary[] = [
  { id: "i1", number: "INV-2026-0038", issueDate: "2026-07-01", dueDate: "2026-07-15", amount: 12000, status: "paid" },
  { id: "i2", number: "INV-2026-0044", issueDate: "2026-08-01", dueDate: "2026-08-15", amount: 12000, status: "paid" },
  { id: "i3", number: "INV-2026-0051", issueDate: "2026-09-01", dueDate: "2026-09-15", amount: 9500, status: "overdue" },
  { id: "i4", number: "INV-2026-0057", issueDate: "2026-09-25", dueDate: "2026-10-09", amount: 6400, status: "open" },
  { id: "i5", number: "INV-2026-0060", issueDate: "2026-09-29", amount: 4800, status: "draft" },
];

export const portalActivity = (ar: boolean): PortalActivity[] => [
  { id: "a1", actor: { name: ar ? "نورة" : "Noura" }, title: ar ? "بدأت العمل على نسخة الجوال" : "Started the mobile layout", at: "2026-09-28T09:10:00" },
  { id: "a2", actor: { name: "Omar" }, title: ar ? "أرسل تقويم التوفر للمراجعة" : "Sent the availability calendar for review", description: ar ? "بانتظار ملاحظاتكم." : "Waiting for your feedback.", at: "2026-09-27T16:40:00" },
  { id: "a3", actor: { name: ar ? "ليلى" : "Layla" }, title: ar ? "أنهت رسائل التأكيد بالبريد" : "Finished the confirmation emails", at: "2026-09-24T11:00:00" },
  { id: "a4", title: ar ? "أُرسلت الفاتورة INV-2026-0057" : "Invoice INV-2026-0057 was sent", at: "2026-09-25T08:00:00" },
];
