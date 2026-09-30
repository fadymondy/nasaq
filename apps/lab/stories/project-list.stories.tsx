import { ProjectList } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { makeProjects } from "./_crm-demo";

const meta = { title: "Components/Workflow/Project List", component: ProjectList, parameters: { layout: "padded" } } satisfies Meta<typeof ProjectList>;
export default meta;
type Story = StoryObj;

/** Status, progress, members and due date; overdue dates are marked in text and colour. */
export const Default: Story = { render: () => <ProjectList projects={makeProjects("en")} onRowClick={() => undefined} /> };
export const Cards: Story = { render: () => <ProjectList projects={makeProjects("en")} defaultView="cards" /> };
export const Loading: Story = { render: () => <ProjectList projects={[]} loading /> };
export const Empty: Story = { render: () => <ProjectList projects={[]} /> };
export const ErrorState: Story = { render: () => <ProjectList projects={[]} error="Could not load projects." onRetry={() => undefined} /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ProjectList projects={makeProjects("ar")} onRowClick={() => undefined} /> };
export const ArabicCards: Story = { globals: { locale: "ar" }, render: () => <ProjectList projects={makeProjects("ar")} defaultView="cards" /> };
