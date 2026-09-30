import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Layout/Accordion", component: Accordion } satisfies Meta<typeof Accordion>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Single mode: opening one panel closes the others. The chevron turns, the panel animates height. */
export const Default: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <Accordion className="w-96" defaultValue={["a"]}>
        <AccordionItem value="a">
          <AccordionTrigger>{ar ? "معلومات الحساب" : "Account details"}</AccordionTrigger>
          <AccordionPanel>{ar ? "الاسم والبريد الإلكتروني ورقم الجوال." : "Name, email address and phone number."}</AccordionPanel>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>{ar ? "الأمان" : "Security"}</AccordionTrigger>
          <AccordionPanel>{ar ? "كلمة المرور والتحقق بخطوتين." : "Password and two-step verification."}</AccordionPanel>
        </AccordionItem>
        <AccordionItem value="c" disabled>
          <AccordionTrigger>{ar ? "الفوترة (غير متاحة)" : "Billing (unavailable)"}</AccordionTrigger>
          <AccordionPanel>{ar ? "غير متاح." : "Unavailable."}</AccordionPanel>
        </AccordionItem>
      </Accordion>
    );
  },
};

/** `multiple` lets any number of panels stay open. */
export const Multiple: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <Accordion multiple className="w-96" defaultValue={["a", "b"]}>
        <AccordionItem value="a">
          <AccordionTrigger>{ar ? "الإشعارات" : "Notifications"}</AccordionTrigger>
          <AccordionPanel>{ar ? "اختر متى نراسلك." : "Choose when we contact you."}</AccordionPanel>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>{ar ? "اللغة" : "Language"}</AccordionTrigger>
          <AccordionPanel>{ar ? "العربية أو الإنجليزية." : "Arabic or English."}</AccordionPanel>
        </AccordionItem>
        <AccordionItem value="c">
          <AccordionTrigger>{ar ? "الخصوصية" : "Privacy"}</AccordionTrigger>
          <AccordionPanel>{ar ? "من يرى ملفك." : "Who can see your profile."}</AccordionPanel>
        </AccordionItem>
      </Accordion>
    );
  },
};

/** The classic use: frequently asked questions. */
export const FAQ: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    const items = ar
      ? [
          ["هل يمكنني تغيير خطتي لاحقاً؟", "نعم، يمكنك الترقية أو التخفيض في أي وقت من صفحة الفوترة، وتُحتسب الفروقات تلقائياً."],
          ["ما وسائل الدفع المتاحة؟", "نقبل مدى وفيزا وماستركارد والتحويل البنكي للخطط السنوية."],
          ["هل بياناتي محفوظة داخل المملكة؟", "نعم، تُستضاف بيانات العملاء في مراكز بيانات داخل المملكة العربية السعودية."],
          ["كيف أتواصل مع الدعم؟", "عبر الدردشة داخل التطبيق أو البريد الإلكتروني، ونرد خلال يوم عمل واحد."],
        ]
      : [
          ["Can I change my plan later?", "Yes. Upgrade or downgrade any time from the billing page; the difference is prorated automatically."],
          ["Which payment methods do you accept?", "Mada, Visa, Mastercard, and bank transfer for annual plans."],
          ["Is my data stored in the Kingdom?", "Yes. Customer data is hosted in data centres inside Saudi Arabia."],
          ["How do I reach support?", "Use in-app chat or email us; we reply within one business day."],
        ];
    return (
      <div className="w-full max-w-xl">
        <h2 className="mb-3 text-h3">{ar ? "الأسئلة الشائعة" : "Frequently asked questions"}</h2>
        <Accordion>
          {items.map(([q, a], i) => (
            <AccordionItem key={q} value={`q${i}`}>
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionPanel>{a}</AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  },
};
