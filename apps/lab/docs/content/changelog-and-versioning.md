# Changelog and versioning

## Current version: 0.1.0

This is the first public release. The components are used daily in the author's own products, but the API has not been through outside use, so treat everything as **0.x**: minor versions may contain breaking changes, and patch versions will not.

| What | Status in 0.1.0 |
| --- | --- |
| Web components and provider | Usable. Each component's manual states its `status`: `stable`, `beta` or `experimental`. |
| Tokens and brands | Usable. Token names are the contract; values may be tuned. |
| shadcn registry | Usable. Item names follow component folder names. |
| MCP server | Usable, read-only. |
| React Native kit | Early. |
| Electron chrome | Early. |

## How releases work

The repository uses [Changesets](https://github.com/changesets/changesets). Every pull request that changes a published package adds a small file describing the change and its size (patch, minor or major). When a release is cut, those files are turned into version bumps and into the package `CHANGELOG.md` entries.

Published packages:

- `@fadymondy/nasaq`: the components, tokens, brands, React Native kit and Electron chrome, one version for all.
- `@fadymondy/nasaq-mcp`: the MCP server.

The registry has no version of its own. It is rebuilt from the same source on each deploy of this site, so `npx shadcn@latest add @nasaq/button` always gives the components of the current release. Use `--diff` before overwriting files you have edited.

## Where to read the changes

- The package `CHANGELOG.md` files in the repository, written by Changesets at release time.
- GitHub releases at [github.com/fadymondy/nasaq/releases](https://github.com/fadymondy/nasaq/releases).


Before 1.0 the goal is to settle component names, props and token names.
