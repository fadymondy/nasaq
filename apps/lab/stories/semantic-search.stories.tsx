import { SemanticSearch } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SemanticSearchDemo } from "./_t2-demo";

const meta = { title: "Components/AI Assistant/Semantic Search", component: SemanticSearch, parameters: { layout: "padded" } } satisfies Meta<typeof SemanticSearch>;
export default meta;
type Story = StoryObj;

/** Type a query and press Enter. Results get facet chips, highlighted words and a score. Try "none" for no results and "error" for a failure. */
export const Default: Story = { render: () => <SemanticSearchDemo /> };
export const Idle: Story = { render: () => <SemanticSearch onSearch={() => undefined} /> };
export const Searching: Story = { render: () => <SemanticSearch onSearch={() => undefined} defaultQuery="annual leave" searching /> };
export const ErrorState: Story = { render: () => <SemanticSearch onSearch={() => undefined} defaultQuery="annual leave" error="The search could not run." onRetry={() => undefined} /> };
export const NoResults: Story = { render: () => <SemanticSearch onSearch={() => undefined} defaultQuery="unknown topic" results={[]} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <SemanticSearchDemo /> };
