import { CompanyList } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { makeCompanies } from "./_crm-demo";

const meta = { title: "Components/CRM/Company List", component: CompanyList, parameters: { layout: "padded" } } satisfies Meta<typeof CompanyList>;
export default meta;
type Story = StoryObj;

/** Square logo tiles (initials here, since the demo has no logo files), domain, industry and contacts count. */
export const Default: Story = { render: () => <CompanyList companies={makeCompanies("en")} onRowClick={() => undefined} /> };
export const Cards: Story = { render: () => <CompanyList companies={makeCompanies("en")} defaultView="cards" /> };
export const Loading: Story = { render: () => <CompanyList companies={[]} loading /> };
export const Empty: Story = { render: () => <CompanyList companies={[]} /> };
export const ErrorState: Story = { render: () => <CompanyList companies={[]} error="Could not load companies." onRetry={() => undefined} /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <CompanyList companies={makeCompanies("ar")} onRowClick={() => undefined} /> };
export const ArabicCards: Story = { globals: { locale: "ar" }, render: () => <CompanyList companies={makeCompanies("ar")} defaultView="cards" /> };
