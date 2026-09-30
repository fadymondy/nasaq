import { GeoList } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { gaReport, useAr } from "./_analytics-demo";

const meta = { title: "Components/Analytics/Geo List", component: GeoList, parameters: { layout: "padded" } } satisfies Meta<typeof GeoList>;
export default meta;
type Story = StoryObj;

function Demo() {
  const ar = useAr();
  return <GeoList className="max-w-xl" valueLabel={ar ? "المستخدمون" : "Users"} rows={gaReport(28, ar).countries} />;
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Loading: Story = { render: () => <GeoList className="max-w-xl" valueLabel="Users" rows={[]} loading /> };
export const UnknownCountry: Story = {
  render: () => (
    <GeoList
      className="max-w-xl"
      valueLabel="Users"
      rows={[
        { code: "SA", value: 4200 },
        { code: "ZZ", value: 310 },
      ]}
    />
  ),
};
