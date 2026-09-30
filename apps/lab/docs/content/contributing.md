# Contributing

Nasaq is developed in the open at [github.com/fadymondy/nasaq](https://github.com/fadymondy/nasaq). Bug reports, fixes, accessibility findings and new components are welcome. For anything larger than a fix, open an issue first so the shape can be agreed before you invest the time.

## Set up

You need Node 22 or newer and pnpm 11.

```bash
git clone https://github.com/fadymondy/nasaq.git
cd nasaq
pnpm install
pnpm lab            # this Storybook, on http://localhost:6106
```

## The checks

CI runs these, and so should you before opening a pull request:

```bash
pnpm typecheck          # TypeScript across every package
pnpm lint               # logical properties only, no raw hex colours
pnpm test               # includes the token contrast matrix
pnpm check:components   # every component has a valid README and a story
pnpm --filter @nasaq/site registry   # build and validate the shadcn registry
```

## Layout of the repo

| Path | What is there |
| --- | --- |
| `packages/web` | The components (`src/components/<name>/`), provider and base styles |
| `packages/tokens` | DTCG token source, generated CSS and the contrast tests |
| `packages/brands` | Brand manifests and the official marks |
| `packages/native`, `packages/electron` | React Native kit and Electron window chrome |
| `packages/mcp` | The MCP server |
| `packages/nasaq` | The published npm package that re-exports the others |
| `apps/lab` | This Storybook: stories, these docs |
| `apps/site` | The registry builder and the docs sync used by the landing site |
| `docs/` | Design rules and the component README spec |

## Adding or changing a component

1. Create `packages/web/src/components/<name>/` with `<name>.tsx` and an `index.ts` that re-exports it. Build on a Base UI primitive when one exists.
2. Write its manual, `README.md`, in the format in `docs/COMPONENT-README.md`: frontmatter, when to use it, API tables, accessibility, RTL notes. The manual feeds the docs tab, the registry and the MCP server, so it has to match the code.
3. Write its story in `apps/lab/stories/`. The story id is the lowercased title with spaces and slashes turned into dashes, and the README's `story:` field must point at it. Cover the states and an Arabic story.
4. Export it from `packages/web/src/index.ts`.
5. Run the checks above.

## House rules

- **Logical properties only.** `ms-*`, `pe-*`, `text-start`, `start-0`, `border-s`, `rounded-s`. Never `ml-`, `pr-`, `left-`, `text-left`. In comments say "context-click", not the physical mouse-button word, because lint scans them.
- **Tokens, not colours.** No raw hex in components. If a token is missing, add it to `packages/tokens/src/dtcg` and rebuild.
- **Direction-safe.** Directional icons go through `Icon`; user text of unknown direction goes through `Bdi` or `BidiText`.
- **Accessible by default.** Keyboard operable, visible focus, labelled, no colour-only state. The lab runs axe on every story.
- **No new runtime dependencies in `packages/web`** without discussing it first.
- **Official brand marks are never recoloured, mirrored or redrawn.** Use `ProductMark`.
- **Do not add font files, logos or images you do not have the right to redistribute.**

## Commits and releases

Use short, imperative commit messages. Releases are managed with [Changesets](https://github.com/changesets/changesets): a change that affects a published package needs a changeset (`pnpm changeset`), which says which packages change and whether it is a patch, minor or major. See [Changelog and versioning](?page=docs-project-changelog-and-versioning).

## Security

Please do not open public issues for vulnerabilities. Follow the policy in `SECURITY.md` in the repository.

## Licence

By contributing you agree that your contribution is released under the project's MIT licence.
