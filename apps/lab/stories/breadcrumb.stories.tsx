import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  useNasaq,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Navigation/Breadcrumb", component: Breadcrumb } satisfies Meta<typeof Breadcrumb>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Location trail. The last item is the current page: not a link, `aria-current="page"`. Separators flip in RTL. */
export const Default: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">{ar ? "المشاريع" : "Projects"}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#">{ar ? "متجر الرياض" : "Riyadh Storefront"}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>MH-142 {ar ? "إصلاح تسجيل الدخول" : "Fix login redirect"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  },
};

/** Long names truncate instead of wrapping the header; the current page keeps priority. */
export const Truncation: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <div className="w-72 rounded-md border border-border p-3">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="max-w-24">
              <BreadcrumbLink href="#">{ar ? "مشاريع العملاء الحكومية" : "Government client projects"}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="max-w-24">
              <BreadcrumbLink href="#">{ar ? "بوابة الخدمات الإلكترونية" : "E-services portal redesign"}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{ar ? "الإعدادات" : "Settings"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    );
  },
};

/** A custom separator replaces the directional chevron. */
export const CustomSeparator: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <Breadcrumb aria-label={ar ? "مسار التنقل" : "Breadcrumb"}>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">{ar ? "الفواتير" : "Invoices"}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>INV-2026-031</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  },
};
