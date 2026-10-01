import { AgentPersonaEditor } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AgentPersonaDemo, PERSONA_MODELS, makePersona } from "./_t2-demo";

const meta = { title: "Components/AI Agents/Agent Persona Editor", component: AgentPersonaEditor, parameters: { layout: "padded" } } satisfies Meta<typeof AgentPersonaEditor>;
export default meta;
type Story = StoryObj;

/** Edit the persona markdown, colour, icon, traits and model, preview it, then save. A name containing "fail" makes the save fail. */
export const Default: Story = { render: () => <AgentPersonaDemo /> };
export const NoPreview: Story = { render: () => <AgentPersonaEditor value={makePersona(false)} models={PERSONA_MODELS} hidePreview onSave={() => undefined} /> };
export const Disabled: Story = { render: () => <AgentPersonaEditor value={makePersona(false)} models={PERSONA_MODELS} disabled onSave={() => undefined} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <AgentPersonaDemo /> };
