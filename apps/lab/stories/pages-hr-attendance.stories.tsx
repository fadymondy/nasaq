import type { Meta, StoryObj } from "@storybook/react-vite";
import { HrPageDemo, useAr, V2Page } from "./_v2-demo";

const meta = { title: "Pages/App/HR Attendance and Leave", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <V2Page title={ar ? "الحضور والإجازات" : "Attendance and leave"} description={ar ? "الحضور والإجازات وكشوف الرواتب في مكان واحد." : "Attendance, leave and payroll in one place."}>
      <HrPageDemo />
    </V2Page>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
