import { AdminArea, AdminPage, Button, EmptyState } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ArabicScope, useAr } from "./_profile-demo";

const meta = { title: "Components/Layout/Admin Area", component: AdminArea, parameters: { layout: "fullscreen" } } satisfies Meta<typeof AdminArea>;
export default meta;
type Story = StoryObj;

function Demo({ impersonating = false }: { impersonating?: boolean }) {
  const ar = useAr();
  const [acting, setActing] = useState(impersonating);
  const [item, setItem] = useState("users");
  return (
    <div className="h-dvh">
      <AdminArea
        activeItem={item}
        onItemSelect={(id) => setItem(id)}
        user={{ name: ar ? "سارة الحربي" : "Sara Alharbi", email: "sara@nasaq.dev" }}
        environment={ar ? "الإنتاج" : "Production"}
        impersonating={acting ? { name: ar ? "عمر خليل" : "Omar Khalil" } : null}
        onStopImpersonating={() => setActing(false)}
      >
        <div className="h-full overflow-y-auto">
          <AdminPage
            title={item}
            description={ar ? "وصف الصفحة." : "What this page is for."}
            breadcrumbs={[{ label: ar ? "الإدارة" : "Admin" }, { label: item }]}
            actions={<Button variant="primary">{ar ? "إجراء" : "Action"}</Button>}
          >
            <EmptyState title={ar ? "المحتوى هنا" : "Content goes here"} />
          </AdminPage>
        </div>
      </AdminArea>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Impersonating: Story = { render: () => <Demo impersonating /> };
export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <Demo impersonating />
    </ArabicScope>
  ),
};
