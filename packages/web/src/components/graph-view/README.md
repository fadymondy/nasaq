---
name: graph-view
title: Graph view
category: data-display
status: beta
summary: One knowledge graph in four views, a live force-directed graph with draggable shaped nodes, a schema of columns with connectors, a card grid and a sortable list, with shared search, type filters and a node inspector.
exports: [GraphView, GraphViewMode, GraphLabelPosition, GraphViewNode, GraphViewLink, GraphViewKind, GraphViewLinkKind, GraphNodeRenderContext, GraphViewLabels, GraphViewProps]
related: [tree-view, entity-list, data-table, workflow-network]
story: components-data-display-graph-view
base-ui: [toggle-group]
keywords: [graph, knowledge graph, network, nodes, links, relations, brain, mindmap, inspector, grid, list, schema, force, simulation, drag, shapes]
---

# Graph view

Explore connected things (notes, people, places, documents) as a live graph, as a schema of columns, as a grid of cards, or as a sortable list, over the same data. Search and type filters apply to all four, the selected node stays selected when you switch, and an inspector shows it with everything it links to.

## When to use

- A knowledge base, memory or wiki where the relations matter as much as the items.
- Letting people choose between "see the shape", "see the workflow by type", "browse" and "scan and sort".

## When not to use

- A strict hierarchy: use [`TreeView`](../tree-view/README.md).
- Plain records with no relations: use [`DataTable`](../data-table/README.md) or [`EntityList`](../entity-list/README.md).
- Explaining a process step by step: use [`WorkflowNetwork`](../workflow-network/README.md).

## Import

```tsx
import { GraphView } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { GraphView } from "@fadymondy/nasaq/web";
import { FileText, User } from "lucide-react";

export function Brain() {
  return (
    <div className="h-[640px]">
      <GraphView
        kinds={[
          { id: "person", label: "People", hue: "blue", icon: User, shape: "circle" },
          { id: "doc", label: "Documents", hue: "amber", icon: FileText, shape: "rounded" },
        ]}
        nodes={[
          { id: "sara", label: "Sara", kind: "person", description: "Product lead" },
          { id: "spec", label: "Onboarding spec", kind: "doc", updatedAt: "2026-09-20T10:00:00Z" },
        ]}
        links={[{ source: "sara", target: "spec", label: "wrote", kind: "authored" }]}
        linkKinds={[{ id: "authored", style: "flow", arrow: true }]}
        onOpen={(node) => router.push(`/n/${node.id}`)}
      />
    </div>
  );
}
```

## Anatomy

```
GraphView                        data-slot="graph-view" [data-mode]
├─ toolbar                       search, type filter (multi ToggleGroup), counts, view switch
├─ content                       one of
│  ├─ graph                      data-slot="graph-canvas" [data-live] [data-settled]: SVG, pan, zoom, drag
│  │  └─ node                    [data-node] [data-pinned]: shape, icon, label, pin dot
│  ├─ schema                     data-slot="graph-schema": a column per type [data-column], cards [data-node], SVG connectors [data-hot]
│  ├─ grid                       cards, [data-node]
│  └─ list                       sortable Table, [data-node]
└─ aside                         data-slot="graph-inspector": details, tags, links to, linked from, actions
```

## API

### `GraphView`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `nodes` | `GraphViewNode[]` | required | `{ id, label, kind, description?, tags?, updatedAt?, shape?, weight?, icon?, labelPosition? }`. |
| `links` | `GraphViewLink[]` | required | `{ source, target, label?, kind? }` by node id. Links to unknown ids are ignored. |
| `kinds` | `GraphViewKind[]` | required | `{ id, label, hue, icon?, shape?, labelPosition? }`: the types, their colour (a `TagHue`), default shape and filter. |
| `linkKinds?` | `GraphViewLinkKind[]` | none | `{ id, label?, style?, arrow?, hue? }`: how links with that `kind` are drawn. `style` is `"solid"`, `"dashed"` or `"flow"`. |
| `mode?`, `defaultMode?`, `onModeChange?` | `"graph" \| "schema" \| "grid" \| "list"` | `"graph"` | The view. Controlled or not. |
| `selectedId?`, `defaultSelectedId?`, `onSelectedChange?` | `string \| null` | `null` | The selected node. Controlled or not. |
| `animate?` | `boolean` | `true` | Run the live simulation. `false` draws the settled layout at once. |
| `arrows?` | `boolean` | `false` | Arrowheads on every link (a link kind's `arrow` overrides it). |
| `labelPosition?` | `"bottom" \| "right" \| "inside" \| "none"` | `"bottom"` | Where node labels go by default. |
| `renderNode?` | `(ctx: GraphNodeRenderContext) => ReactNode` | none | Replace a node's drawing. Receives `{ node, kind, shape, radius, selected, highlighted, dimmed, pinned }` and returns SVG centred on (0, 0). |
| `onPinnedChange?` | `(ids: string[]) => void` | none | Called when the set of pinned nodes changes. |
| `onOpen?` | `(node) => void` | none | Adds an Open button to the inspector. |
| `renderActions?` | `(node) => ReactNode` | none | Extra inspector actions. |
| `toolbarEnd?` | `ReactNode` | none | Extra toolbar controls (Add node). |
| `height?` | `number \| string` | `"100%"` | Minimum 420px. |
| `labels?` | `Partial<GraphViewLabels>` | en/ar | Override any string. |

### Shapes

`circle`, `square`, `rounded`, `diamond`, `hexagon`, `pill`. The shape comes from `node.shape`, else `kind.shape`, else `circle`. Size comes from `node.weight` when set (any number, "how important"), else from how many links the node has.

### Link styles

`solid`, `dashed` and `flow` (dashes that travel along the link, direction source to target). Links stop on the outline of each shape, and an arrowhead lands on the target. Flow is drawn still under reduced motion.

## Examples

### Controlled view and selection

```tsx
const [mode, setMode] = useState<GraphViewMode>("schema");
<GraphView nodes={nodes} links={links} kinds={kinds} mode={mode} onModeChange={setMode} selectedId={params.node} onSelectedChange={(id) => setParam("node", id)} />
```

### Custom node

```tsx
<GraphView
  {...data}
  renderNode={({ node, radius, selected }) => (
    <g>
      <circle r={radius} className={selected ? "fill-card stroke-nq-focus" : "fill-card stroke-nq-line-strong"} />
      <text textAnchor="middle" y={4}>{[...node.label][0]}</text>
    </g>
  )}
/>
```

### Drag, pin and keys

Drag a node to move and pin it (a dot marks it) and links follow live. Double-click a pinned node, or press Delete or Backspace on it, to release it. A click still selects. Drag the empty field to pan; use the wheel, the buttons, or a two-finger pinch to zoom. With a node focused, the arrow keys nudge it 12px (Shift for 48px), Enter or Space selects.

### How it works

The graph is a live force simulation with its own loop: repulsion between nodes, springs on links, a weak pull to the centre and collisions between shapes. Heat cools every frame and it stops once settled, so it costs nothing at rest. It re-heats when you drag a node or when the filter or data change (nodes that stay keep their place, new ones start beside a linked neighbour). It pauses while the tab is hidden or the graph is off-screen. The view auto-fits while it settles, until you pan or zoom yourself.

Under `prefers-reduced-motion`, with `animate={false}`, and on the server, nothing moves: the deterministic force layout is drawn settled at once (the same data always draws the same picture). Dragging still works and still pins. Built for up to a few hundred nodes; beyond that, filter first.

### Schema view

One column per type, with the count in the header and a card per node. Cards are ordered so linked cards sit near each other. Connectors are measured from the rendered cards, so they stay right whatever the card height. Hover or focus a card to highlight its links and dim the rest. It pans and zooms like the graph and fits the width on load.

## Accessibility

- Every node in the graph is a focusable button named "label, type"; Enter or Space selects, arrow keys nudge, Delete releases a pin. The schema cards, grid and list offer the same data as plain buttons and a table with sortable, `aria-sort` headers, so the graph is never the only way in.
- The view switch and type filter are toggle groups with accessible names.
- Type is never colour only: shapes differ by kind, and filters, cards, the list and the inspector all show the type name.
- Pan and zoom have buttons; nothing requires a mouse wheel, a drag or a pinch.
- Reduced motion turns off the simulation and the flowing links.

## RTL & i18n

- The graph surface stays left-to-right like any diagram, and its controls sit at the physical corners of it; the toolbar, cards, list, inspector and every string follow the page direction (English and Arabic built in).
- The schema view reads with the page: in RTL the first column is at the right, columns flow right to left, and connectors and arrowheads follow.
- Search folds Arabic: hamza forms of alef, taa marbuta, alef maqsura and diacritics are ignored.
- Counts and dates use Latin digits in `<bdi>` / `DateTime`. Directional icons (Open) mirror.

## Styling & tokens

- Node colour is the kind's tag hue (`--nq-tag-<hue>`); links `--nq-line-strong`, highlighted links and pin dots `--nq-brand`; selection `--nq-focus`. Cards use `bg-card` and `border-border`; a schema card's start border takes the kind hue. No raw hex.
- Target `[data-slot=graph-view]`, `[data-slot=graph-canvas]`, `[data-slot=graph-schema]`, `[data-slot=graph-inspector]`, `[data-node]`, `[data-pinned]`.

## Do / Don't

- **Do** keep kinds to six or fewer so the colours stay distinguishable, and give them different shapes.
- **Do** give nodes a `description`; it powers search, cards and the inspector.
- **Don't** pass a new `nodes`, `links` or `linkKinds` array on every render; it re-heats the simulation. Memoise them.

## Related

- [TreeView](../tree-view/README.md) · [EntityList](../entity-list/README.md) · [WorkflowNetwork](../workflow-network/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-data-display-graph-view--docs
