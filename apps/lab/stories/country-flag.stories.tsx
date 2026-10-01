import { CountryFlag, NasaqProvider, PHONE_COUNTRIES, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

const meta = { title: "Components/Data Display/Country Flag", component: CountryFlag, args: { code: "SA" } } satisfies Meta<typeof CountryFlag>;
export default meta;
type Story = StoryObj<typeof meta>;

function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

const ARAB = ["SA", "AE", "EG", "KW", "QA", "BH", "OM", "JO", "LB", "IQ", "PS", "MA", "DZ", "TN", "LY", "SD"];

function Grid() {
  const ar = useNasaq().locale.startsWith("ar");
  return (
    <ul className="grid w-[40rem] max-w-full grid-cols-2 gap-x-6 gap-y-3 text-body-sm sm:grid-cols-3">
      {ARAB.map((iso) => {
        const c = PHONE_COUNTRIES.find((x) => x.iso === iso)!;
        return (
          <li key={iso} className="flex min-w-0 items-center gap-2">
            <CountryFlag code={iso} className="text-[1.125rem]" />
            <span className="truncate">{ar ? c.ar : c.en}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** One flag. Change `code` in the controls. */
export const Default: Story = { args: { code: "SA", className: "text-[2rem]" } };

/** It is `1em` tall, so it follows the text size; pale flags keep a hairline edge on a white card. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      {["text-caption", "text-body", "text-[1.5rem]", "text-[2.5rem]"].map((size) => (
        <CountryFlag key={size} code="JP" className={size} />
      ))}
      <CountryFlag code="CY" className="text-[2.5rem]" />
      <CountryFlag code="SA" className="text-[2.5rem]" />
    </div>
  ),
};

/** With the country name next to it: the flag is decorative. */
export const WithNames: Story = { render: () => <Grid /> };

/** Arabic: names switch language; the flags are never mirrored. */
export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <div className="p-2">
        <Grid />
      </div>
    </ArabicScope>
  ),
};
