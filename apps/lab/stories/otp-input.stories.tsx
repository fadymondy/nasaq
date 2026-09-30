import { Field, FieldDescription, FieldError, FieldLabel, OtpInput, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Forms/OtpInput", component: OtpInput } satisfies Meta<typeof OtpInput>;
export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const ar = useNasaq().locale.startsWith("ar");
  const [code, setCode] = useState("");
  const [done, setDone] = useState<string | null>(null);
  return (
    <Field className="w-fit">
      <FieldLabel>{ar ? "رمز التحقق" : "Verification code"}</FieldLabel>
      <OtpInput
        name="code"
        value={code}
        onValueChange={(v) => {
          setCode(v);
          setDone(null);
        }}
        onComplete={setDone}
        getBoxLabel={(i, n) => (ar ? `الخانة ${i + 1} من ${n}` : `Digit ${i + 1} of ${n}`)}
      />
      <FieldDescription>
        {done ? (ar ? `تم إدخال الرمز ${done}` : `Entered ${done}`) : ar ? "أدخل الرمز المكوّن من 6 أرقام." : "Enter the 6-digit code."}
      </FieldDescription>
    </Field>
  );
}

export const Default: Story = { render: () => <Demo /> };

export const FourDigits: Story = {
  render: () => (
    <Field className="w-fit">
      <FieldLabel>PIN</FieldLabel>
      <OtpInput length={4} defaultValue="12" />
    </Field>
  ),
};

export const Invalid: Story = {
  render: () => {
    function Bad() {
      const ar = useNasaq().locale.startsWith("ar");
      return (
        <Field invalid className="w-fit">
          <FieldLabel>{ar ? "رمز التحقق" : "Verification code"}</FieldLabel>
          <OtpInput defaultValue="123456" invalid />
          <FieldError match>{ar ? "الرمز غير صحيح." : "That code is incorrect."}</FieldError>
        </Field>
      );
    }
    return <Bad />;
  },
};

export const Disabled: Story = { render: () => <OtpInput defaultValue="4821" disabled /> };
