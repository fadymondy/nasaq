/* The catalogue: product list with bulk edit of price, stock and status, and a collections manager with rule-based collections and a live match preview. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StoreProductsPage } from "./_store-admin-demo";

const meta = { title: "Components/Store Admin/Pages/Products", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Select rows and use Bulk edit; context-click a row for actions. */
export const Default: Story = { render: () => <StoreProductsPage /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <StoreProductsPage /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <StoreProductsPage /> };

export const MobileArabic: Story = { globals: { locale: "ar", viewport: { value: "mobile" } }, render: () => <StoreProductsPage /> };

export const Loading: Story = { render: () => <StoreProductsPage mode="loading" /> };

export const Empty: Story = { render: () => <StoreProductsPage mode="empty" /> };

export const ErrorState: Story = { render: () => <StoreProductsPage mode="error" /> };

/** Manual and rule-based collections. Open one to change its rules and watch the preview. */
export const Collections: Story = { render: () => <StoreProductsPage startTab="collections" /> };

export const CollectionsArabic: Story = { globals: { locale: "ar" }, render: () => <StoreProductsPage startTab="collections" /> };
