import { Badge, Text } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Foundations/Surfaces & colour roles", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const LEVELS = [
  { token: "bg", use: "Page canvas" },
  { token: "surface", use: "Sidebar, panels, cards" },
  { token: "surface-raised", use: "A card inside a panel, sticky header" },
  { token: "surface-overlay", use: "Menus, popovers, dialogs, sheets, toasts" },
];

/**
 * Four levels, each one step lighter in dark and one step whiter in light. A nested layer moves up
 * exactly one level; borders separate siblings on the same level, not levels themselves.
 */
export const SurfaceLadder: Story = {
  render: () => (
    <div className="bg-nq-bg p-8">
      <div className="rounded-card border border-border bg-nq-surface p-6">
        <div className="rounded-card border border-border bg-nq-surface-raised p-6">
          <div className="w-fit rounded-floating border border-border bg-nq-surface-overlay p-4 shadow-floating">
            <Text variant="label">surface-overlay</Text>
          </div>
          <Text variant="caption" className="mt-3 block">surface-raised</Text>
        </div>
        <Text variant="caption" className="mt-3 block">surface</Text>
      </div>
      <Text variant="caption" className="mt-3 block">bg</Text>
      <dl className="mt-8 grid w-fit grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-body-sm">
        {LEVELS.map((l) => (
          <div key={l.token} className="contents">
            <dt><code>--nq-{l.token}</code></dt>
            <dd className="text-muted-foreground">{l.use}</dd>
          </div>
        ))}
      </dl>
    </div>
  ),
};

/** Hover and selected are fg overlays, so they work on any surface level without a per-level token. */
export const Interaction: Story = {
  render: () => (
    <div className="flex gap-6 bg-nq-bg p-8">
      {["bg-nq-surface", "bg-nq-surface-overlay"].map((ground) => (
        <div key={ground} className={`w-56 rounded-card border border-border p-1.5 ${ground}`}>
          <div className="flex h-8 items-center rounded-control px-2 text-body-sm">Rest</div>
          <div className="flex h-8 items-center rounded-control bg-nq-hover px-2 text-body-sm">Hover</div>
          <div className="flex h-8 items-center rounded-control bg-nq-selected px-2 text-body-sm font-medium">Selected</div>
        </div>
      ))}
    </div>
  ),
};

/** Five roles that never stand in for each other. The brand swatch follows the active brand; the rest don't. */
export const ColourRoles: Story = {
  render: () => (
    <div className="grid w-fit grid-cols-[auto_auto_1fr] items-center gap-x-6 gap-y-3 p-8 text-body-sm">
      <span className="size-6 rounded-control bg-nq-brand" /> <code>brand</code> <span className="text-muted-foreground">Product identity: logo, product switcher, "Pro"</span>
      <span className="size-6 rounded-control bg-nq-primary-action" /> <code>primary-action</code> <span className="text-muted-foreground">The one primary button per view</span>
      <span className="size-6 rounded-control bg-nq-accent" /> <code>accent</code> <span className="text-muted-foreground">Nasaq gold: active-nav marker, featured</span>
      <span className="flex gap-1"><Badge variant="success">success</Badge><Badge variant="warning">warning</Badge><Badge variant="danger">danger</Badge><Badge variant="info">info</Badge></span>
      <code>status</code>
      <span className="text-muted-foreground">Fixed across brands, always with a label</span>
    </div>
  ),
};
