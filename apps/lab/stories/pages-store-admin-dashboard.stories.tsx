/* The store admin home: KPIs against the previous period, sales chart, funnel, top lists, stock alerts and recent orders. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StoreDashboardPage } from "./_store-dashboard-demo";

const meta = { title: "Pages/Store Admin/Dashboard", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Change the period, the comparison or the channel above; restock a low-stock row; Customise rearranges the board. Live visitors tick every few seconds. */
export const Default: Story = { render: () => <StoreDashboardPage /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <StoreDashboardPage /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <StoreDashboardPage /> };

export const MobileArabic: Story = { globals: { locale: "ar", viewport: { value: "mobile" } }, render: () => <StoreDashboardPage /> };

/** Skeleton tiles and the board's loading state while the numbers arrive. */
export const Loading: Story = { render: () => <StoreDashboardPage mode="loading" /> };

/** A store with no orders in the chosen period. */
export const Empty: Story = { render: () => <StoreDashboardPage mode="empty" /> };

/** The request failed; Try again loads it. */
export const ErrorState: Story = { render: () => <StoreDashboardPage mode="error" /> };
