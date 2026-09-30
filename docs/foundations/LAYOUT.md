# Cards, borders and whitespace

Nasaq layouts are flat by default: content sits on `surface` and groups are separated by space and type, not boxes.

## Use whitespace and a heading when

- The group is a section of the page (settings sections, a detail view's blocks).
- The items share one surface and one purpose (a form, a list, a table).
- You're tempted to put a card around a single table or list. The table already has rows; give it a heading and let it sit on the surface.

## Use a card when

- The item is a **unit the user acts on or compares**: a KPI, an app in a store grid, a plan in a pricing table.
- The group needs **its own actions** (header menu, footer buttons) that must visibly belong to it.
- The content sits **beside unrelated content** in a grid and would otherwise bleed into it.

No cards inside cards. If you need a sub-group inside a card, use a divider or a heading.

## Borders

- `line` separates siblings: table rows, list items, the sidebar edge, a card edge.
- `line-strong` is for interactive edges only: hovered inputs, the resize handle, focus-adjacent affordances.
- A border and a level change together mark a floating layer (menus, dialogs). Everything else uses one or the other.

## Density

Spacing comes from the density tokens (`comfortable`, `compact`, `dense`). Don't hand-tune padding per screen. If a screen feels loose, switch its density.

## Filler

Don't add widgets to fill a grid: no decorative charts, "welcome" cards, or empty-state art on populated screens. An empty cell is fine.
