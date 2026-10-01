import { FeatureFlagList } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FlagsDemo, flagEnvironments, featureFlags, useAr } from "./_moharrik-demo";

const meta = { title: "Components/Developer Tools/Feature Flags", component: FeatureFlagList, parameters: { layout: "padded" } } satisfies Meta<typeof FeatureFlagList>;
export default meta;
type Story = StoryObj;

function ReadOnly() {
  const ar = useAr();
  return <FeatureFlagList flags={featureFlags(ar)} environments={flagEnvironments(ar)} />;
}

export const Default: Story = { render: () => <FlagsDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <FlagsDemo /> };
export const ReadOnlyList: Story = { render: () => <ReadOnly /> };
export const Empty: Story = { render: () => <FeatureFlagList flags={[]} environments={flagEnvironments(false)} /> };
export const Loading: Story = { render: () => <FeatureFlagList flags={[]} environments={flagEnvironments(false)} loading /> };
