# Colour and surfaces

## Surface levels

| Level | Token | Use |
|---|---|---|
| 0 | `--nq-bg` | Page canvas |
| 1 | `--nq-surface` | Sidebar, panels, cards (`bg-card`) |
| 2 | `--nq-surface-raised` | A card inside a panel, sticky table header |
| 3 | `--nq-surface-overlay` | Menus, popovers, dialogs, sheets, toasts (`bg-popover`) |
| — | `--nq-surface-soft` | Inset fills: inputs' wells, avatars, table footers. Not a level. |

In dark, each level is lighter than the one below it. In light, each level is whiter. A nested layer moves up exactly one level. Borders separate siblings on the same level; they are not what separates levels.

Hover and selected are overlays of `fg` (`--nq-hover` 5–6 %, `--nq-selected` 8–10 %), so they read on any level without a per-level token. Use `bg-nq-hover` for pointer hover and `bg-nq-selected` for current, pressed, open and keyboard-highlighted items.

## Roles

These five never stand in for each other.

| Role | Token | Follows the brand? | Use |
|---|---|---|---|
| Brand | `--nq-brand` | yes | Product identity: mark, product switcher, "Pro" badge |
| Primary action | `--nq-primary-action` (`bg-primary`) | yes | The one primary button on a view |
| Accent | `--nq-accent` | no (Nasaq gold) | Active-nav marker, featured, focus of attention |
| Status | `--nq-{success,warning,danger,info}` (+ `-text`, `-soft`) | no | State of a thing |
| Tags | `--nq-tag-*` | no | User-defined categories. Never status. |

Status tones are fixed across brands so "failed" looks the same in every product. Use `<Status tone>` inline and `<Badge variant>` as a chip. Every status carries a label, and `Status` also gives each tone its own icon shape.

### Brand/status collisions

Some brand actions share a hue family with a status. Brand colours are not Nasaq's to change, so these are accepted and listed in `packages/tokens/test/contrast.test.ts` (`KNOWN_STATUS_COLLISIONS`). The test fails on any unlisted collision and on any stale entry.

| Brand | Collides with | Rule in that product |
|---|---|---|
| Health Debug | danger | Destructive buttons say what they destroy, and use the danger icon. Never a bare red button. |
| CircleXO, Hosbah | info | Info states always use the `info` icon + label. |
| fadymondy, Seatfor, Orchestra | warning | Warning states always use the `warning` icon + label. |
