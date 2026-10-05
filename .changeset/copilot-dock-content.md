---
"@fadymondy/nasaq": minor
---

CopilotDock hosts any panel, not only a chat: `children` (or a render function given `{ controls, close, expanded, side }`) replaces `CopilotChat`, and `barContent` puts your own summary in the collapsed bar. `messages` and `onSend` are optional when `children` is set.
