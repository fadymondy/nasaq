import { Button, Field, FieldDescription, FieldLabel, NasaqProvider, PasswordInput, computePasswordRules, computeRuleScore, estimatePasswordStrength, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";

const meta = { title: "Components/Forms/Password Input", component: PasswordInput } satisfies Meta<typeof PasswordInput>;
export default meta;
type Story = StoryObj<typeof meta>;

const useAr = () => useNasaq().locale.startsWith("ar");

function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

/** Sign in. The eye is a toggle button: `aria-pressed` says whether the password is shown. */
export const Default: Story = {
  render: () => {
    const ar = useAr();
    return (
      <div className="max-w-sm">
        <Field>
          <FieldLabel>{ar ? "كلمة المرور" : "Password"}</FieldLabel>
          <PasswordInput autoComplete="current-password" placeholder={ar ? "أدخل كلمة المرور" : "Enter your password"} />
        </Field>
      </div>
    );
  },
};

/** Sign up. The built-in estimator scores length and character classes; type to watch it move. */
export const WithStrength: Story = {
  name: "With strength meter",
  render: () => {
    const ar = useAr();
    const [value, setValue] = useState("");
    return (
      <div className="max-w-sm">
        <Field>
          <FieldLabel>{ar ? "كلمة مرور جديدة" : "New password"}</FieldLabel>
          <PasswordInput autoComplete="new-password" showStrength value={value} onChange={(e) => setValue(e.target.value)} />
          <FieldDescription>
            {ar ? `٨ أحرف على الأقل. الدرجة الحالية: ${estimatePasswordStrength(value)} من ٤.` : `At least 8 characters. Current score: ${estimatePasswordStrength(value)} of 4.`}
          </FieldDescription>
        </Field>
      </div>
    );
  },
};

/** Bring your own estimator (zxcvbn, a server check) and pass its 0 to 4 result as `score`. */
export const ExternalScore: Story = {
  name: "External score",
  render: () => {
    const ar = useAr();
    const [score, setScore] = useState(2);
    return (
      <div className="flex max-w-sm flex-col gap-4">
        <PasswordInput aria-label={ar ? "كلمة المرور" : "Password"} defaultValue="hunter2-hunter2" showStrength score={score} />
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4].map((s) => (
            <Button key={s} size="sm" variant={s === score ? "primary" : "secondary"} onClick={() => setScore(s)}>
              {s}
            </Button>
          ))}
        </div>
      </div>
    );
  },
};

export const States: Story = {
  render: () => {
    const ar = useAr();
    return (
      <div className="flex max-w-sm flex-col gap-4">
        <PasswordInput aria-label="visible" defaultValue="Visible-123" defaultVisible />
        <PasswordInput aria-label="disabled" defaultValue="locked-secret" disabled />
        <PasswordInput aria-label="invalid" defaultValue="short" aria-invalid showStrength />
        <PasswordInput aria-label="ltr" ltr placeholder={ar ? "القيمة تبقى من اليسار" : "Value pinned left-to-right"} />
      </div>
    );
  },
};

/** RTL and Arabic copy. The toggle sits at the inline end (the left); the meter fills from the right. */
export const ArabicRtl: Story = {
  name: "Arabic RTL",
  render: () => (
    <ArabicScope>
      <div className="flex max-w-sm flex-col gap-5">
        <Field>
          <FieldLabel>كلمة مرور جديدة</FieldLabel>
          <PasswordInput autoComplete="new-password" showStrength defaultValue="كلمةسر-Strong-2026" />
          <FieldDescription>استخدم ٨ أحرف على الأقل.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel>كلمة المرور</FieldLabel>
          <PasswordInput autoComplete="current-password" placeholder="أدخل كلمة المرور" />
        </Field>
      </div>
    </ArabicScope>
  ),
};

/** A policy checklist under the field. Each rule ticks as it is met; the meter follows the rules through `computeRuleScore`. */
export const WithRules: Story = {
  name: "With requirements",
  render: () => {
    const ar = useAr();
    const [value, setValue] = useState("");
    const rules = computePasswordRules(value, { minLength: 10 });
    return (
      <div className="max-w-sm">
        <Field>
          <FieldLabel>{ar ? "كلمة مرور جديدة" : "New password"}</FieldLabel>
          <PasswordInput
            autoComplete="new-password"
            showStrength
            score={computeRuleScore(rules)}
            rules={rules}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
      </div>
    );
  },
};

/** Your own rules: pass `PasswordRule[]` and a label for each id. */
export const CustomRules: Story = {
  name: "Custom requirements",
  render: () => {
    const ar = useAr();
    const [value, setValue] = useState("");
    const rules = [
      { id: "length", met: value.length >= 8, min: 8 },
      { id: "no-name", met: value.length > 0 && !/nasaq/i.test(value) },
      { id: "no-space", met: value.length > 0 && !/\s/.test(value) },
    ];
    return (
      <div className="max-w-sm">
        <Field>
          <FieldLabel>{ar ? "كلمة مرور جديدة" : "New password"}</FieldLabel>
          <PasswordInput
            autoComplete="new-password"
            rules={rules}
            ruleLabels={ar ? { "no-name": "لا تحتوي على اسم المنتج", "no-space": "بدون مسافات" } : { "no-name": "Does not contain the product name", "no-space": "No spaces" }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
      </div>
    );
  },
};

export const RulesArabic: Story = { name: "Requirements (Arabic)", globals: { locale: "ar" }, render: WithRules.render };
