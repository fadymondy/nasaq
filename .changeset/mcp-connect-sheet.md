---
"@fadymondy/nasaq": minor
---

McpConnect gets `layout="steps"` (client select, numbered steps, no card). New `McpConnectSheet` side-over with connection-type tiles and a primary-colour `ConnectButton`.

New `McpConnectApps`: a non-technical MCP setup — pick your app (Claude, ChatGPT, Claude Code, Cursor, VS Code, other) by its real logo, then plain numbered steps with one big button. OAuth apps need only the link; the rest take a key from `renderKeyForm`. Brand logos exported (`ClaudeLogo`, `OpenAILogo`, …, `McpAppLogo`). `ConnectButton` gains a light that travels around its edge (motion-safe).
