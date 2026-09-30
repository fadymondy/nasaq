import { Button, PageActions, PageHeader, Status } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { frame } from "./_frame";
import { useAr } from "./_lifecycle-demo";

const meta = {
  title: "Components/Layout/Page Header",
  component: PageHeader,
  args: { title: "Customers", description: "Everyone who bought from you or opened an account." },
  decorators: [frame("w-full max-w-5xl")],
} satisfies Meta<typeof PageHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** A list page: breadcrumbs, the title and one primary action. */
export const ListPage: Story = {
  render: () => {
    const ar = useAr();
    return (
      <PageHeader
        breadcrumbs={[{ label: ar ? "الرئيسية" : "Home", href: "#" }, { label: ar ? "المبيعات" : "Sales", href: "#" }, { label: ar ? "العملاء" : "Customers" }]}
        title={ar ? "العملاء" : "Customers"}
        description={ar ? "كل من اشترى منك أو فتح حساباً." : "Everyone who bought from you or opened an account."}
        actions={
          <>
            <Button variant="secondary">
              <Download /> {ar ? "تصدير" : "Export"}
            </Button>
            <Button>
              <Plus /> {ar ? "عميل جديد" : "New customer"}
            </Button>
          </>
        }
      />
    );
  },
};

/** A detail page reached from a list: a back link, meta facts and the page's actions behind PageActions. */
export const DetailPage: Story = {
  render: () => {
    const ar = useAr();
    return (
      <PageHeader
        backHref="#"
        title="Nour Adel"
        description={ar ? "عميلة منذ مارس ٢٠٢٤ · الرياض" : "Customer since March 2024 · Riyadh"}
        meta={
          <>
            <Status tone="success">{ar ? "نشط" : "Active"}</Status>
            <span>{ar ? "١٢ طلباً" : "12 orders"}</span>
            <span>{ar ? "آخر تحديث قبل ساعتين" : "Updated 2 hours ago"}</span>
          </>
        }
        actions={
          <PageActions
            commands={false}
            primary={{ id: "edit", label: ar ? "تعديل" : "Edit", icon: Pencil, onSelect: () => {} }}
            actions={[{ id: "delete", label: ar ? "حذف" : "Delete", icon: Trash2, danger: true, onSelect: () => {} }]}
          />
        }
      />
    );
  },
};

export const Arabic: Story = { ...DetailPage, globals: { locale: "ar" } };
