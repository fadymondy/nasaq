import { NotificationItem, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CreditCard } from "lucide-react";
import { useState } from "react";

const meta = { title: "Components/Feedback/Notification Item", component: NotificationItem, args: { title: "Notification" } } satisfies Meta<typeof NotificationItem>;
export default meta;
type Story = StoryObj<typeof meta>;

/** One row of the notifications side-over. Unread = accent dot plus stronger title, never colour alone. */
export const Default: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <div className="w-96 rounded-md border border-border">
        <NotificationItem
          unread
          unreadLabel={ar ? "غير مقروء" : "Unread"}
          actor={{ name: ar ? "سارة الحربي" : "Sara Alharbi" }}
          title={ar ? "سارة الحربي أشارت إليك في MH-142" : "Sara Alharbi mentioned you in MH-142"}
          description={ar ? "هل يمكنك مراجعة إعادة التوجيه بعد تسجيل الدخول قبل الإصدار؟" : "Can you review the post-login redirect before the release?"}
          time={ar ? "منذ 5 د" : "5m"}
        />
      </div>
    );
  },
};

/** A mixed feed: an icon instead of an avatar for system events. Click marks a row read. */
export const Feed: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    const [read, setRead] = useState<Set<number>>(new Set());
    const items = [
      {
        actor: { name: ar ? "خالد العتيبي" : "Khaled Alotaibi" },
        title: ar ? "أسند إليك المهمة «ربط بوابة الدفع»" : "Assigned you “Connect the payment gateway”",
        description: ar ? "متجر الرياض" : "Riyadh Storefront",
        time: ar ? "منذ 12 د" : "12m",
        unread: true,
      },
      {
        icon: <CreditCard />,
        title: ar ? "تم دفع الفاتورة INV-2026-031" : "Invoice INV-2026-031 was paid",
        description: ar ? "12,450.00 ر.س" : "SAR 12,450.00",
        time: ar ? "منذ ساعة" : "1h",
        unread: true,
      },
      {
        actor: { name: ar ? "نورة السبيعي" : "Noura Alsubaie" },
        title: ar ? "علّقت على «تصميم صفحة الدخول»" : "Commented on “Design the sign-in page”",
        time: ar ? "أمس" : "Yesterday",
        unread: false,
      },
    ];
    return (
      <div className="w-96 divide-y divide-border rounded-md border border-border">
        {items.map((n, i) => (
          <NotificationItem
            key={i}
            {...n}
            unread={n.unread && !read.has(i)}
            unreadLabel={ar ? "غير مقروء" : "Unread"}
            onClick={() => setRead((s) => new Set(s).add(i))}
          />
        ))}
      </div>
    );
  },
};

/** Long copy clamps the description to two lines; the time stays at the inline end. */
export const LongText: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <div className="w-80 rounded-md border border-border">
        <NotificationItem
          actor={{ name: ar ? "ريم الدوسري" : "Reem Aldosari" }}
          title={ar ? "طلبت مراجعة على طلب الدمج" : "Requested your review on a pull request"}
          description={
            ar
              ? "تعديل شامل لمسار الدفع يشمل التحقق من العنوان الوطني، وإعادة المحاولة عند فشل البوابة، وتحديث رسائل الخطأ بالعربية والإنجليزية."
              : "A broad rework of the checkout flow: national address validation, retry when the gateway fails, and updated error messages in Arabic and English."
          }
          time={ar ? "منذ 3 س" : "3h"}
        />
      </div>
    );
  },
};
