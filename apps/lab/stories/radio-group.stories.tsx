import { Field, FieldDescription, FieldError, FieldLabel, Radio, RadioCard, RadioGroup, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Forms/Radio Group", component: RadioGroup } satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <RadioGroup defaultValue="email" aria-label={ar ? "طريقة التواصل" : "Contact by"}>
        <label className="flex items-center gap-2 text-body-sm">
          <Radio value="email" /> {ar ? "البريد الإلكتروني" : "Email"}
        </label>
        <label className="flex items-center gap-2 text-body-sm">
          <Radio value="sms" /> {ar ? "رسالة نصية" : "SMS"}
        </label>
        <label className="flex items-center gap-2 text-body-sm text-muted-foreground">
          <Radio value="phone" disabled /> {ar ? "اتصال هاتفي (غير متاح)" : "Phone call (unavailable)"}
        </label>
      </RadioGroup>
    );
  },
};

/** Label, description and error come from Field, like Checkbox. */
export const InField: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <Field name="billing" invalid className="max-w-sm">
        <FieldLabel id="billing-label">{ar ? "دورة الفوترة" : "Billing period"}</FieldLabel>
        <FieldDescription>{ar ? "يمكنك التغيير في أي وقت." : "You can change this any time."}</FieldDescription>
        <RadioGroup aria-labelledby="billing-label">
          <label className="flex items-center gap-2 text-body-sm">
            <Radio value="monthly" /> {ar ? "شهريًا" : "Monthly"}
          </label>
          <label className="flex items-center gap-2 text-body-sm">
            <Radio value="yearly" /> {ar ? "سنويًا" : "Yearly"}
          </label>
        </RadioGroup>
        <FieldError match>{ar ? "اختر دورة الفوترة." : "Choose a billing period."}</FieldError>
      </Field>
    );
  },
};

/** The card variant for plan-style choices. */
export const Cards: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    const [plan, setPlan] = useState("pro");
    return (
      <RadioGroup value={plan} onValueChange={(v) => setPlan(v as string)} aria-label={ar ? "الخطة" : "Plan"} className="max-w-md">
        <RadioCard value="free" title={ar ? "مجاني" : "Free"} description={ar ? "للتجربة" : "For trying it out"} meta={ar ? "٠ $" : "$0"} />
        <RadioCard value="pro" title={ar ? "احترافي" : "Pro"} description={ar ? "للفرق النامية" : "For growing teams"} meta={ar ? "١٢ $" : "$12"} />
        <RadioCard value="team" title={ar ? "الفريق" : "Team"} description={ar ? "لوحة تحكم وصلاحيات" : "Admin console and roles"} meta={ar ? "٣٩ $" : "$39"} disabled />
      </RadioGroup>
    );
  },
};
