import type { Meta, StoryObj } from "@storybook/react-vite";
import { MediaManagerDemo, StoreProductEditorPage, StoreProductsPage, VariantMatrixDemo } from "./_store-admin-demo";

const meta = { title: "Components/Store Admin/Store Products Admin", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Product list with bulk edit of price, stock and status. */
export const Default: Story = { render: () => <StoreProductsPage /> };

/** Pictures with reorder (drag, or the move buttons), alt text, and a broken URL that shows a placeholder. */
export const Media: Story = { render: () => <MediaManagerDemo /> };

/** Change an option value and the matrix regenerates while keeping the data of variants that remain. */
export const Variants: Story = { render: () => <VariantMatrixDemo /> };

export const Editor: Story = { render: () => <StoreProductEditorPage /> };

export const Collections: Story = { render: () => <StoreProductsPage startTab="collections" /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <StoreProductsPage /> };

export const Loading: Story = { render: () => <StoreProductsPage mode="loading" /> };

export const Empty: Story = { render: () => <StoreProductsPage mode="empty" /> };

export const ErrorState: Story = { render: () => <StoreProductsPage mode="error" /> };
