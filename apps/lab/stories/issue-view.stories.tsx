import type { Meta, StoryObj } from "@storybook/react-vite";
import { IssueQuickViewDemo, IssueViewDemo } from "./_mahaam-demo";

const meta = { title: "Components/Workflow/Issue View", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Inline title and description, properties beside the content, checklist, sub-issues, linked PRs, comments, activity, time and AI cost. */
export const Default: Story = { render: () => <IssueViewDemo /> };

/** The stacked layout for a narrow panel. */
export const Drawer: Story = { render: () => <div className="max-w-xl"><IssueViewDemo variant="drawer" /></div> };

/** The same issue in a side drawer, opened from a board card or a table row. */
export const QuickView: Story = { parameters: { layout: "fullscreen" }, render: () => <IssueQuickViewDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <IssueViewDemo /> };

export const QuickViewArabic: Story = { globals: { locale: "ar" }, parameters: { layout: "fullscreen" }, render: () => <IssueQuickViewDemo /> };
