import { Badge, Button, GraphView, type GraphViewKind, type GraphViewLink, type GraphViewNode } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus, Star } from "lucide-react";
import { type ComponentProps, useMemo, useState } from "react";
import { graphData, graphKinds, graphLinkKinds, useAr } from "./_workflow-demo";

const meta = { title: "Components/Data Display/Graph View", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

type Props = Partial<ComponentProps<typeof GraphView>>;

function Demo(props: Props) {
  const ar = useAr();
  const data = useMemo(() => graphData(ar), [ar]);
  const kinds = useMemo(() => graphKinds(ar), [ar]);
  const linkKinds = useMemo(() => graphLinkKinds(ar), [ar]);
  return (
    <div className="h-screen min-h-[560px] p-4">
      <GraphView
        nodes={data.nodes}
        links={data.links}
        kinds={kinds}
        linkKinds={linkKinds}
        onOpen={() => undefined}
        toolbarEnd={
          <Button variant="secondary" size="sm">
            <Plus aria-hidden />
            {ar ? "عقدة" : "Node"}
          </Button>
        }
        {...props}
      />
    </div>
  );
}

/** A live graph: it settles when it loads, re-heats when you drag a node or change the filter, and rests when still. */
export const Default: Story = { render: () => <Demo /> };

/** Same graph, watched from the start: the simulation stops once it settles and pauses while the tab is hidden or the graph is off-screen. */
export const Animated: Story = { render: () => <Demo arrows /> };

function DragDemo() {
  const ar = useAr();
  const [pinned, setPinned] = useState<string[]>([]);
  return (
    <Demo
      onPinnedChange={setPinned}
      toolbarEnd={
        <Badge variant="outline" data-testid="pinned-count">
          {ar ? `مثبّتة: ${pinned.length}` : `Pinned: ${pinned.length}`}
        </Badge>
      }
    />
  );
}

/** Drag a node to move and pin it (a dot marks it); double-click releases it. A click still selects. Arrow keys nudge a focused node, Delete releases it. */
export const Drag: Story = { render: () => <DragDemo /> };

const shapeKinds = (ar: boolean): GraphViewKind[] => [
  { id: "circle", label: ar ? "دائرة" : "Circle", hue: "blue", shape: "circle" },
  { id: "square", label: ar ? "مربع" : "Square", hue: "green", shape: "square" },
  { id: "rounded", label: ar ? "مستدير" : "Rounded", hue: "amber", shape: "rounded" },
  { id: "diamond", label: ar ? "معيّن" : "Diamond", hue: "pink", shape: "diamond" },
  { id: "hexagon", label: ar ? "سداسي" : "Hexagon", hue: "violet", shape: "hexagon" },
  { id: "pill", label: ar ? "حبّة" : "Pill", hue: "gray", shape: "pill", labelPosition: "inside" },
];

function shapeData(ar: boolean): { nodes: GraphViewNode[]; links: GraphViewLink[] } {
  const ids = ["circle", "square", "rounded", "diamond", "hexagon", "pill"];
  const names: Record<string, [string, string]> = {
    circle: ["Circle", "دائرة"],
    square: ["Square", "مربع"],
    rounded: ["Rounded", "مستدير"],
    diamond: ["Diamond", "معيّن"],
    hexagon: ["Hexagon", "سداسي"],
    pill: ["Pill label", "حبّة"],
  };
  const nodes: GraphViewNode[] = ids.map((id, i) => ({
    id,
    kind: id,
    label: names[id]?.[ar ? 1 : 0] ?? id,
    // Size from `weight`, not from the number of links.
    weight: [4, 9, 16, 25, 36, 6][i] as number,
  }));
  nodes.push(
    { id: "override", kind: "circle", shape: "hexagon", label: ar ? "شكل مخصص لعقدة" : "Per-node shape", weight: 12, icon: Star },
    { id: "right", kind: "square", label: ar ? "تسمية جانبية" : "Label on the side", labelPosition: "right", weight: 9 },
    { id: "hidden", kind: "diamond", label: ar ? "بلا تسمية" : "No label", labelPosition: "none", weight: 9 },
  );
  const l = (source: string, target: string, kind: string): GraphViewLink => ({ source, target, kind });
  return {
    nodes,
    links: [l("circle", "square", "solid"), l("square", "rounded", "dashed"), l("rounded", "diamond", "flow"), l("diamond", "hexagon", "solid"), l("hexagon", "pill", "dashed"), l("pill", "circle", "flow"), l("override", "circle", "flow"), l("right", "square", "dashed"), l("hidden", "diamond", "solid")],
  };
}

/** A shape per kind (`kind.shape`), overridable per node (`node.shape`), sized by `weight`. Link kinds are solid, dashed or flowing, and can have arrowheads. */
export const Shapes: Story = {
  render: () => {
    const Inner = () => {
      const ar = useAr();
      const data = useMemo(() => shapeData(ar), [ar]);
      const kinds = useMemo(() => shapeKinds(ar), [ar]);
      return (
        <div className="h-screen min-h-[560px] p-4">
          <GraphView
            nodes={data.nodes}
            links={data.links}
            kinds={kinds}
            linkKinds={[
              { id: "solid", style: "solid", arrow: true },
              { id: "dashed", style: "dashed", arrow: true },
              { id: "flow", style: "flow", arrow: true, hue: "blue" },
            ]}
          />
        </div>
      );
    };
    return <Inner />;
  },
};

/** `renderNode` replaces the shape, icon and label. Here a person becomes a badge with a ring when selected. */
export const CustomNode: Story = {
  render: () => (
    <Demo
      renderNode={({ node, radius, selected, dimmed }) => (
        <g opacity={dimmed ? 0.6 : 1}>
          <circle r={radius + 3} fill="none" strokeWidth={selected ? 3 : 1} className={selected ? "stroke-nq-focus" : "stroke-nq-line-strong"} />
          <circle r={radius} className="fill-card stroke-nq-line-strong" strokeWidth={1} />
          <text textAnchor="middle" y={4} fontSize={Math.max(9, radius * 0.9)} className="fill-foreground">
            {[...node.label][0]}
          </text>
          <text textAnchor="middle" y={radius + 14} fontSize={11} className="fill-muted-foreground">
            {node.label}
          </text>
        </g>
      )}
    />
  ),
};

/** Schema: one column per type with the count in its header and a card per node. The connectors are measured from the cards. Hover or focus a card to trace its links. */
export const Schema: Story = { render: () => <Demo defaultMode="schema" arrows /> };

/** With `animate={false}` (and always under `prefers-reduced-motion`) the settled layout is drawn at once and nothing moves. Nodes can still be dragged and pinned. */
export const ReducedMotion: Story = { render: () => <Demo animate={false} arrows /> };

export const Grid: Story = { render: () => <Demo defaultMode="grid" /> };
export const List: Story = { render: () => <Demo defaultMode="list" /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const ArabicSchema: Story = { globals: { locale: "ar" }, render: () => <Demo defaultMode="schema" arrows /> };
