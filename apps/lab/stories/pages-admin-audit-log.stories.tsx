/*
 * The Audit log page of the admin area. Open a row for the before and after of each change. The retention
 * Select saves at once; "Forever" fails and rolls back.
 */
import { AdminArea, AdminPage } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useAr } from "./_team-demo";
import { AuditDemo } from "./_team-pages";

const meta = { title: "Pages/Admin/Audit Log", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <div className="h-dvh">
      <AdminArea activeItem="audit" user={{ name: ar ? "سارة الحربي" : "Sara Alharbi", email: "sara@nasaq.dev" }} environment={ar ? "الإنتاج" : "Production"}>
        <div className="h-full overflow-y-auto">
          <AdminPage
            title={ar ? "سجل التدقيق" : "Audit log"}
            description={ar ? "من فعل ماذا ومتى، من الويب أو الواجهة البرمجية أو الوكلاء." : "Who did what and when, from the web, the API or agents."}
            breadcrumbs={[{ label: ar ? "الأمان" : "Security" }, { label: ar ? "سجل التدقيق" : "Audit log" }]}
          >
            <AuditDemo />
          </AdminPage>
        </div>
      </AdminArea>
    </div>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
