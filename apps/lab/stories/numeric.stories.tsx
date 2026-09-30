import { Num, Text, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Typography/Num", component: Num, args: { value: 48210.5, format: { style: "currency", currency: "USD" } } } satisfies Meta<typeof Num>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const ROWS = [
  { label: "Integer", value: 1284093, format: {} },
  { label: "Currency", value: 48210.5, format: { style: "currency", currency: "SAR" } },
  { label: "Percent", value: -0.041, format: { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" } },
  { label: "Compact", value: 2_400_000, format: { notation: "compact" } },
  { label: "Hours", value: 11.25, format: { style: "unit", unit: "hour", unitDisplay: "short" } },
] as const;

/** Tabular digits keep columns aligned; switch the locale to see Arabic grouping with Western digits. */
export const Formats: Story = {
  render: () => (
    <table className="text-body-sm">
      <tbody>
        {ROWS.map((r) => (
          <tr key={r.label} className="border-b border-border last:border-0">
            <td className="py-2 pe-8 text-muted-foreground">{r.label}</td>
            <td className="py-2 text-end text-foreground">
              <Num value={r.value} format={r.format} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};

/** Inside running Arabic text the figure keeps its internal order ("-4.1%"), and the sentence keeps its own. */
export const InSentence: Story = {
  render: () => {
    const { locale } = useNasaq();
    const ar = locale.startsWith("ar");
    return (
      <Text variant="body" className="max-w-md">
        {ar ? "انخفضت الساعات المسجلة بنسبة " : "Hours tracked fell by "}
        <Num value={-0.041} format={{ style: "percent", maximumFractionDigits: 1 }} />
        {ar ? " إلى " : " to "}
        <Num value={412} />
        {ar ? " ساعة هذا الشهر." : " hours this month."}
      </Text>
    );
  },
};
