import { CurrencyInput, Field, FieldDescription, FieldLabel, formatMinor, NasaqProvider, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";

const meta = { title: "Components/Forms/Currency input", component: CurrencyInput } satisfies Meta<typeof CurrencyInput>;
export default meta;
type Story = StoryObj;

const useAr = () => useNasaq().locale.startsWith("ar");

function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

/** The stored value, as the backend would receive it. */
function Readout({ minor, currency }: { minor: number | null; currency: string }) {
  return (
    <code dir="ltr" className="text-caption text-muted-foreground">
      {minor === null ? "minor: (empty)" : `minor: ${minor} · ${formatMinor(minor, currency, "en")} ${currency}`}
    </code>
  );
}

function Basic({ currency, initial, digits }: { currency: string; initial: number | null; digits?: "latn" | "arab" }) {
  const ar = useAr();
  const [minor, setMinor] = useState<number | null>(initial);
  return (
    <div className="flex w-80 max-w-full flex-col gap-3">
      <Field>
        <FieldLabel>{ar ? "السعر" : "Price"}</FieldLabel>
        <CurrencyInput currency={currency} numberingSystem={digits} value={minor} onValueChange={setMinor} />
        <FieldDescription>{ar ? "اكتب الأرقام بأي لوحة مفاتيح، أو الصق مبلغًا من جدول." : "Type with any keyboard, or paste an amount from a spreadsheet."}</FieldDescription>
      </Field>
      <Readout minor={minor} currency={currency} />
    </div>
  );
}

/** The value is an integer in minor units. `1999` is 19.99; the readout shows what a backend would store. */
export const Default: Story = { render: () => <Basic currency="USD" initial={199900} /> };

/** Arabic: symbol after the figure, group mirrored, the digits still left to right. */
export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <ArabicScope>
      <div className="p-2">
        <Basic currency="SAR" initial={125050} />
      </div>
    </ArabicScope>
  ),
};

/** Editorial forms can show Arabic-Indic digits. Both sets parse either way. */
export const ArabicDigits: Story = {
  globals: { locale: "ar" },
  render: () => (
    <ArabicScope>
      <div className="p-2">
        <Basic currency="SAR" initial={125050} digits="arab" />
      </div>
    </ArabicScope>
  ),
};

function Decimals() {
  const [jpy, setJpy] = useState<number | null>(48000);
  const [kwd, setKwd] = useState<number | null>(12500);
  return (
    <div className="flex w-80 max-w-full flex-col gap-4">
      <Field>
        <FieldLabel>JPY (no decimals)</FieldLabel>
        <CurrencyInput currency="JPY" value={jpy} onValueChange={setJpy} />
        <Readout minor={jpy} currency="JPY" />
      </Field>
      <Field>
        <FieldLabel>KWD (three decimals)</FieldLabel>
        <CurrencyInput currency="KWD" value={kwd} onValueChange={setKwd} />
        <Readout minor={kwd} currency="KWD" />
      </Field>
    </div>
  );
}

/** The currency sets the decimals: JPY takes none, KWD takes three. */
export const CurrencyDecimals: Story = { render: () => <Decimals /> };

function Picker() {
  const ar = useAr();
  const [currency, setCurrency] = useState(ar ? "SAR" : "USD");
  const [minor, setMinor] = useState<number | null>(125000);
  return (
    <div className="flex w-96 max-w-full flex-col gap-3">
      <Field>
        <FieldLabel>{ar ? "الميزانية" : "Budget"}</FieldLabel>
        <CurrencyInput
          currency={currency}
          currencies={["USD", "SAR", "KWD", "JPY"]}
          value={minor}
          onValueChange={setMinor}
          onCurrencyChange={(next, converted) => {
            setCurrency(next);
            setMinor(converted);
          }}
        />
        <FieldDescription>{ar ? "عند تغيير العملة يبقى المبلغ نفسه، وتتبدل الخانات العشرية." : "Switching currency keeps the same amount; only the decimals change."}</FieldDescription>
      </Field>
      <Readout minor={minor} currency={currency} />
    </div>
  );
}

/** A currency picker. Going from USD to KWD turns 1,250.00 into 1,250.000, and to JPY rounds to 1,250. */
export const WithCurrencyPicker: Story = { render: () => <Picker /> };

function Range() {
  const ar = useAr();
  const [minor, setMinor] = useState<number | null>(2500);
  const bad = minor !== null && (minor < 5000 || minor > 5000000);
  return (
    <div className="flex w-80 max-w-full flex-col gap-3">
      <Field invalid={bad}>
        <FieldLabel>{ar ? "الدفعة المقدمة" : "Deposit"}</FieldLabel>
        <CurrencyInput currency="SAR" min={5000} max={5000000} value={minor} onValueChange={setMinor} allowNegative={false} />
        <FieldDescription>{ar ? "بين 50 و50,000 ر.س." : "Between 50 and 50,000 SAR."}</FieldDescription>
      </Field>
      <Readout minor={minor} currency="SAR" />
    </div>
  );
}

/** `min` and `max` mark the field invalid; `clampOnBlur` would pull it back instead. */
export const OutOfRange: Story = { render: () => <Range /> };
