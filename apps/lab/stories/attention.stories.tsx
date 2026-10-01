import { Attention, type AttentionItem, ProductMark, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MessageSquare } from "lucide-react";
import { useState } from "react";

const meta = { title: "Components/Alerts & Notifications/Attention", component: Attention, args: { items: [] } } satisfies Meta<typeof Attention>;
export default meta;
type Story = StoryObj<typeof meta>;

const useAr = () => useNasaq().locale.startsWith("ar");

function makeItems(ar: boolean): AttentionItem[] {
  return [
    {
      id: "conv",
      tone: "info",
      icon: MessageSquare,
      title: ar ? "محادثات غير مقروءة" : "Unread conversations",
      description: ar ? "آخرها من سارة الحربي: «هل الفاتورة جاهزة؟»" : "Latest from Sara Alharbi: “Is the invoice ready?”",
      count: 4,
      time: ar ? "منذ 5 د" : "5m",
      href: "#inbox",
    },
    {
      id: "deploy",
      tone: "danger",
      title: ar ? "فشل نشر متجر الرياض" : "Riyadh Storefront deployment failed",
      description: ar ? "فشل البناء في الخطوة 3 من 5: اختبارات الوحدة" : "Build failed at step 3 of 5: unit tests",
      time: ar ? "منذ 12 د" : "12m",
      href: "#deploy",
      action: { label: ar ? "إعادة المحاولة" : "Retry", onClick: () => {} },
    },
    {
      id: "approve",
      tone: "warning",
      title: ar ? "MH-721 بانتظار موافقتك" : "MH-721 is waiting for your approval",
      description: ar ? "إعادة التوجيه بعد تسجيل الدخول" : "Post-login redirect",
      time: ar ? "منذ ساعتين" : "2h",
      href: "#MH-721",
      action: { label: ar ? "مراجعة" : "Review", href: "#MH-721" },
    },
    {
      id: "deal",
      tone: "neutral",
      title: ar ? "3 صفقات تحتاج متابعة" : "3 deals need a follow-up",
      description: ar ? "لم يتم التواصل منذ أكثر من 7 أيام" : "No contact in more than 7 days",
      count: 3,
      href: "#deals",
    },
  ];
}

/** Products hand in the items; Attention orders them by urgency (danger first) and trims to `max`. */
export const Default: Story = {
  render: () => {
    const ar = useAr();
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    return (
      <div className="w-[36rem] max-w-full">
        <Attention
          viewAllHref="#inbox"
          items={makeItems(ar)
            .filter((i) => !dismissed.has(i.id))
            .map((i) => ({ ...i, onDismiss: () => setDismissed((d) => new Set(d).add(i.id)) }))}
        />
      </div>
    );
  },
};

/** When every item has `done`, it becomes a setup checklist: host order, progress in the header, done rows last. */
export const SetupChecklist: Story = {
  render: () => {
    const ar = useAr();
    const [done, setDone] = useState<Set<string>>(new Set(["domain"]));
    const steps = [
      { id: "domain", title: ar ? "اربط النطاق" : "Connect your domain" },
      { id: "team", title: ar ? "ادعُ فريقك" : "Invite your team", description: ar ? "العمل أسهل مع شخصين على الأقل" : "Work goes better with at least two people" },
      { id: "pay", title: ar ? "فعّل بوابة الدفع" : "Turn on the payment gateway" },
      { id: "brand", title: ar ? "ارفع شعارك" : "Upload your logo" },
    ];
    return (
      <div className="w-[36rem] max-w-full">
        <Attention
          title={ar ? "أكمل الإعداد" : "Finish setting up"}
          items={steps.map((s) => ({
            ...s,
            done: done.has(s.id),
            onSelect: () => setDone((d) => new Set(d).add(s.id)),
            action: { label: ar ? "ابدأ" : "Start", onClick: () => setDone((d) => new Set(d).add(s.id)) },
          }))}
        />
      </div>
    );
  },
};

/** Items from several products, each marked with its product instead of a tone shape. */
export const AcrossProducts: Story = {
  render: () => {
    const ar = useAr();
    return (
      <div className="w-[36rem] max-w-full">
        <Attention
          max={3}
          items={[
            { id: "a", icon: <ProductMark brand="mahaam" size={16} title="" />, title: ar ? "مهمتان متأخرتان" : "2 overdue tasks", tone: "warning", count: 2, href: "#" },
            { id: "b", icon: <ProductMark brand="circlexo" size={16} title="" />, title: ar ? "طلب تثبيت تطبيق جديد" : "New app install request", tone: "info", href: "#" },
            { id: "c", icon: <ProductMark brand="zekra" size={16} title="" />, title: ar ? "فشل مزامنة مصدر البيانات" : "Data source sync failed", tone: "danger", href: "#" },
            { id: "d", title: ar ? "تجديد الاشتراك خلال 3 أيام" : "Subscription renews in 3 days", href: "#" },
            { id: "e", title: ar ? "تقرير الأسبوع جاهز" : "Weekly report is ready", href: "#" },
          ]}
        />
      </div>
    );
  },
};

/** Loading shows placeholder rows. With no items the section disappears, unless `empty` is passed. */
export const LoadingAndEmpty: Story = {
  render: () => {
    const ar = useAr();
    return (
      <div className="flex w-[36rem] max-w-full flex-col gap-8">
        <Attention loading items={[]} />
        <Attention items={[]} empty={ar ? "لا شيء يحتاج انتباهك الآن." : "Nothing needs your attention right now."} />
        <Attention items={[]} />
      </div>
    );
  },
};
