# Contributing to Nasaq

Thank you for helping. Bug reports, fixes, accessibility findings, Arabic and RTL corrections and new components are all welcome. For anything bigger than a fix, please open an issue first so the shape can be agreed before you spend time on it.

The full guide, kept next to the components it describes, is on the documentation site: https://docs.nasaqui.com (Docs, Project, Contributing). This file is the short version.

## Set up

Node 22 or newer and pnpm 11.

```bash
git clone https://github.com/fadymondy/nasaq.git
cd nasaq
pnpm install
pnpm lab          # the Storybook lab on http://localhost:6106
```

## Checks to run before a pull request

```bash
pnpm typecheck
pnpm lint                 # logical properties only, no raw hex colours
pnpm test                 # includes the token contrast matrix
pnpm check:components     # every component has a valid README and a story
pnpm --filter @nasaq/site registry   # build and validate the shadcn registry
```

## Adding a component

1. `packages/web/src/components/<name>/<name>.tsx` plus an `index.ts`. Build on a Base UI primitive where one exists.
2. `README.md` in the same folder, following [`docs/COMPONENT-README.md`](docs/COMPONENT-README.md). It feeds the docs, the registry and the MCP server, so it must match the code.
3. A story in `apps/lab/stories/`, with an Arabic story where direction matters.
4. Export it from `packages/web/src/index.ts`.

## Rules

- Logical properties only (`ms-*`, `pe-*`, `text-start`). Never `ml-`, `pr-`, `left-`, `text-left`.
- Tokens, not colours: no raw hex in components.
- Keyboard operable, visibly focused, labelled, never colour-only state.
- No new runtime dependencies in `packages/web` without discussion.
- Official brand marks are never recoloured, mirrored or redrawn.
- Do not add fonts, logos or images you do not have the right to redistribute.

## Commits and releases

Short, imperative commit messages. A change to a published package needs a changeset (`pnpm changeset`) that says which packages change and whether it is a patch, minor or major.

## Conduct

Be kind and be specific. Critique the work, not the person.

## Licence

By contributing you agree that your contribution is released under the MIT licence of this project.
