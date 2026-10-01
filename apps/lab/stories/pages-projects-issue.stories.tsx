/* One issue as a full page: properties, checklist, sub-issues, development, comments, activity, time and AI cost. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { IssuePageDemo } from "./_mahaam-demo";

const meta = { title: "Components/Projects & Work/Pages/Issue", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <IssuePageDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <IssuePageDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <IssuePageDemo /> };
