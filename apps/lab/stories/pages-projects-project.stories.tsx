/* One project: overview, board, list, timeline, activity, time, AI cost, files, memory, vault, GitHub and settings, with the issue quick view. Each project-level tab has an English, Arabic and Mobile story. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProjectPageDemo } from "./_mahaam-demo";

const meta = { title: "Pages/Projects/Project", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <ProjectPageDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ProjectPageDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <ProjectPageDemo /> };

export const Activity: Story = { render: () => <ProjectPageDemo tab="activity" /> };
export const ActivityArabic: Story = { globals: { locale: "ar" }, render: () => <ProjectPageDemo tab="activity" /> };
export const ActivityMobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <ProjectPageDemo tab="activity" /> };

export const Memory: Story = { render: () => <ProjectPageDemo tab="memory" /> };
export const MemoryArabic: Story = { globals: { locale: "ar" }, render: () => <ProjectPageDemo tab="memory" /> };
export const MemoryMobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <ProjectPageDemo tab="memory" /> };

export const Vault: Story = { render: () => <ProjectPageDemo tab="vault" /> };
export const VaultArabic: Story = { globals: { locale: "ar" }, render: () => <ProjectPageDemo tab="vault" /> };
export const VaultMobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <ProjectPageDemo tab="vault" /> };

export const Github: Story = { render: () => <ProjectPageDemo tab="github" /> };
export const GithubArabic: Story = { globals: { locale: "ar" }, render: () => <ProjectPageDemo tab="github" /> };
export const GithubMobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <ProjectPageDemo tab="github" /> };

export const Settings: Story = { render: () => <ProjectPageDemo tab="settings" /> };
export const SettingsArabic: Story = { globals: { locale: "ar" }, render: () => <ProjectPageDemo tab="settings" /> };
export const SettingsMobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <ProjectPageDemo tab="settings" /> };
