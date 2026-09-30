import type { Meta, StoryObj } from "@storybook/react-vite";
import { LocationPickerDemo, LocationsDemo } from "./_explorer-demo";

const meta = { title: "Components/Developer/Desktop Locations" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Workspace roots: add a folder (Browse fills a path), change permissions, make one the default, re-index, remove. */
export const Default: Story = { render: () => <LocationsDemo /> };

export const Empty: Story = { render: () => <LocationsDemo empty /> };

export const Loading: Story = { render: () => <LocationsDemo loading /> };

/** `DesktopLocationPicker` only lets you choose folders that are ready and writable. */
export const Picker: Story = { render: () => <LocationPickerDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <LocationsDemo /> };
