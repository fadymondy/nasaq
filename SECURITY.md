# Security policy

## Supported versions

Nasaq is at 0.1.0. Security fixes are made on the latest release only.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately, using either of these:

- GitHub: open a private advisory at https://github.com/fadymondy/nasaq/security/advisories/new
- Contact form: https://fadymondy.com (mention "Nasaq security")

Please include what you found, how to reproduce it, the affected package and version, and the impact you expect. You will get an acknowledgement within a few days. Fixes are released as patch versions, and the advisory credits the reporter unless you prefer otherwise.

## Scope

In scope: the published packages (`@fadymondy/nasaq`, `@fadymondy/nasaq-mcp`), the shadcn registry items served at `https://nasaq-ui.fadymondy.com/r/`, the hosted MCP server at `https://nasaq-mcp.fadymondy.com`, and the documentation site.

Notes that help triage:

- The registry and the MCP server are read-only and serve public data. They have no accounts, sessions or secrets.
- The documentation site is a static build with no server-side code.
- Reports about third-party dependencies are welcome; please check they are reachable through Nasaq before reporting.

## Handling secrets in this repository

No secret belongs in the repository. `.env`, `.env.local` and `.mcp.json` are ignored by git. If you find one committed, report it as above.
