import { Alert, Button, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Alerts & Notifications/Alert", component: Alert } satisfies Meta<typeof Alert>;
export default meta;
type Story = StoryObj<typeof meta>;

const useAr = () => useNasaq().locale.startsWith("ar");

/** One notice per tone. Each tone has its own glyph, so it reads without colour. */
export const Tones: Story = {
  render: () => {
    const ar = useAr();
    return (
      <div className="flex w-[36rem] max-w-full flex-col gap-3">
        <Alert tone="info" title={ar ? "صيانة مجدولة" : "Scheduled maintenance"}>
          {ar ? "ستتوقف المزامنة لمدة 10 دقائق مساء الجمعة." : "Sync pauses for 10 minutes on Friday evening."}
        </Alert>
        <Alert tone="success" title={ar ? "تم حفظ التغييرات" : "Changes saved"}>
          {ar ? "ستظهر الأسعار الجديدة في المتجر خلال دقيقة." : "New prices appear in the storefront within a minute."}
        </Alert>
        <Alert tone="warning" title={ar ? "اقتربت من حد الخطة" : "You are close to your plan limit"}>
          {ar ? "استخدمت 45 من 50 مقعدًا." : "You have used 45 of 50 seats."}
        </Alert>
        <Alert tone="danger" title={ar ? "فشلت المزامنة" : "Sync failed"}>
          {ar ? "تعذّر الاتصال بمصدر البيانات. تحقق من بيانات الدخول." : "Could not reach the data source. Check the credentials."}
        </Alert>
      </div>
    );
  },
};

/** Without a title it is a one-line notice. */
export const OneLine: Story = {
  render: () => {
    const ar = useAr();
    return (
      <div className="w-[36rem] max-w-full">
        <Alert tone="warning">{ar ? "هذه الفاتورة مسودة ولم تُرسل بعد." : "This invoice is a draft and has not been sent."}</Alert>
      </div>
    );
  },
};

/** An action at the inline end, and a dismiss button the host wires up. */
export const WithAction: Story = {
  render: () => {
    const ar = useAr();
    const [open, setOpen] = useState(true);
    return (
      <div className="w-[36rem] max-w-full">
        {open ? (
          <Alert
            tone="danger"
            title={ar ? "فشل الدفع" : "Payment failed"}
            action={<Button size="sm">{ar ? "تحديث البطاقة" : "Update card"}</Button>}
            onDismiss={() => setOpen(false)}
          >
            {ar ? "سيُقيَّد الحساب خلال 3 أيام إن لم يُحدَّث." : "The account is restricted in 3 days unless it is updated."}
          </Alert>
        ) : (
          <Button size="sm" onClick={() => setOpen(true)}>
            {ar ? "إظهار التنبيه" : "Show alert again"}
          </Button>
        )}
      </div>
    );
  },
};
