# Accessibility

Nasaq aims for WCAG 2.2 AA in the parts it controls. It gets there by building on accessible primitives, testing the things a machine can test on every change, and documenting what a caller has to supply.

## What the library does

- **Base UI primitives.** Dialogs, menus, popovers, selects, tabs, switches, tooltips and the like are built on [Base UI](https://base-ui.com), which provides the roles, focus management, typeahead and keyboard behaviour to the WAI-ARIA patterns. Nasaq does not reimplement them.
- **Keyboard.** Every interactive component works from the keyboard. Each manual has a keyboard table (`Key | Action`) under "Accessibility".
- **Visible focus.** One focus token, `--nq-focus`, draws a 2px outline on every control, in a colour that has contrast against every surface in both themes.
- **Contrast.** A test computes the contrast of text, status and action colours against their surfaces in every theme and brand, and fails the build on regressions. Documented exceptions (some brand colours share a hue with a status) are paired with a rule: state is never colour alone.
- **Not colour alone.** Status has a label and its own icon shape.
- **Reduced motion.** Animations and transitions are turned off under `prefers-reduced-motion: reduce`.
- **Target sizes.** Controls are 24px (dense, small) to 40px (comfortable) high depending on density.
- **Names for icons.** `Icon` hides decorative glyphs from assistive technology and takes a `label` when the glyph carries meaning.
- **Announcements.** Toasts are announced through a live region (Sonner).
- **Direction.** The provider sets `lang` and `dir`, and passes direction to the primitives so keyboard arrows follow reading order in RTL.

## How it is checked

This Storybook runs the axe engine (through `@storybook/addon-a11y`) on every story with `test: "error"`, so a violation is reported as an error rather than a hint. Open the **Accessibility** tab under any story to see the results for the story you are viewing. Automated checks find perhaps a third of real problems; they are a floor, not a certificate.

## What you still have to do

- **Label things.** Icon-only buttons need an `aria-label` (or the component's `label` prop). Inputs need a `Field` with a label, or their own. Localise those labels.
- **Write meaningful text.** Link and button names, error messages, headings in order.
- **Keep one level-one heading per page** and do not skip levels; components do not add headings for you.
- **Do not rely on hover.** Anything shown on hover has to be reachable by keyboard and touch.
- **Check your own compositions.** Screens made of accessible parts can still fail, for example through a broken focus order or a custom modal.
- **Test with a screen reader** for flows that matter, in English and in Arabic.

## Reporting a problem

Accessibility bugs are treated as bugs, not enhancements. Please [open an issue](https://github.com/fadymondy/nasaq/issues) with the component, the browser and assistive technology, and what happened. See [Contributing](?page=docs-project-contributing).
