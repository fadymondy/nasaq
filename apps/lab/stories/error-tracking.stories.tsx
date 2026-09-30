import { ErrorTracking } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { errorIssues, useAr, wait } from "./_devtools-q3-demo";

const meta = { title: "Components/Developer/Error Tracking", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo() {
  const ar = useAr();
  return <ErrorTracking issues={errorIssues(ar)} onStatusChange={async () => wait(600)} />;
}

/** Open an error for its stack trace, breadcrumbs, tags and captured screenshot, console and network. */
export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
