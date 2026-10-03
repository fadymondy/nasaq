---
name: social-composer
title: SocialComposer
category: marketing
status: beta
summary: One post for several social networks. Each target gets its own limit, counter, preview, media check and optional own version, and a metrics table reports how the posts did.
exports: [SocialComposer, SocialComposerProps, SocialComposerLabels, SocialAccount, SocialPost, SocialComposerAssistAction, SocialMetricsTable, SocialMetricsTableProps, SocialMetricsTableLabels, SocialMetricsRow]
related: [ai-states, date-picker, data-table, stat-card, progress]
story: components-marketing-social-composer
base-ui: [progress]
keywords: [social, post, composer, schedule, x, twitter, bluesky, threads, linkedin, facebook, instagram, tiktok, character limit, hashtags, metrics]
---

# SocialComposer

Write once, post to many. Pick the accounts, write the text, and every chosen platform shows its own counter against its
own limit, a preview of what it will send, and what is still missing (Instagram needs an image, TikTok a video). Any
platform can take a version of its own. **Nothing is cut for you**: the composer says what is wrong and the author fixes it.

`SocialMetricsTable` is the other half: totals plus a sortable per-post table of impressions, engagements and rate.

The limits come from the write plugins of fadymondy.com-v2: X 280 (a link weighs 23), Bluesky 300, Threads 500,
LinkedIn 3,000, Facebook 63,206, Instagram 2,200 (image required, 30 hashtags at most), TikTok 2,200 (video required).

## When to use

- A publishing screen for a brand or studio that posts to several networks.
- Showing how posts performed next to the composer.

## When not to use

- A single long-form editor: use the rich text editor.
- Actually sending posts: this component collects and checks the post; your backend talks to each network.

## Import

```tsx
import { SocialComposer, SocialMetricsTable, checkSocialPost } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { SocialComposer } from "@fadymondy/nasaq/web";

export function Publish() {
  return (
    <SocialComposer
      accounts={[
        { id: "x1", platform: "x", name: "@nasaq" },
        { id: "li1", platform: "linkedin", name: "Nasaq Studio" },
      ]}
      onSubmit={(post, checks) => console.log(post, checks)}
    />
  );
}
```

## Anatomy

```
SocialComposer            data-slot="social-composer"
├─ accounts               toggle buttons (aria-pressed), one per connected account
├─ text                   Field + Textarea
├─ media + Improve        attach buttons, chips, AiSplitButton
├─ schedule               DatePicker + TimePicker
├─ actions                Publish now / Schedule post, Save draft
└─ targets                one Card per chosen platform  data-slot="social-target" data-level="ok|near|over"
   ├─ counter             Progress + "n of limit"
   ├─ preview or own text
   └─ problems            empty, over, media, hashtags
```

## API

### `SocialComposer`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `accounts` | `SocialAccount[]` | required | `{ id, platform, name }`. Platform is `x`, `bluesky`, `threads`, `linkedin`, `facebook`, `instagram` or `tiktok`. |
| `value?` / `defaultValue?` | `SocialPost` | empty post | `{ body, variants, accountIds, media, scheduledAt }`. |
| `onValueChange?` | `(post) => void` | none | Every edit. |
| `onAttach?` | `(kind: "image" \| "video") => SocialMedia \| null \| void \| Promise<...>` | none | Open your picker and return the file. Without it the attach buttons are hidden. |
| `assistActions?` | `{ id, label }[]` | none | Choices in the Improve menu; the first runs from the main button. |
| `onAssist?` | `(actionId, post) => void` | none | You run the AI action and write the result back with `onValueChange`. |
| `assisting?` | `boolean` | `false` | Spinner on Improve. |
| `onSubmit?` | `(post, checks) => void` | none | Only enabled when every target passes. |
| `onSaveDraft?` | `(post) => void` | none | Always enabled. |
| `submitting?` / `disabled?` | `boolean` | `false` | |
| `locale?` | `string` | provider locale | |
| `labels?` | `SocialComposerLabels` | Arabic and English | Every visible string. |

### `SocialMetricsTable`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `rows` | `SocialMetricsRow[]` | required | `{ id, platform, account?, text, status, publishedAt?, impressions?, likes?, replies?, reposts?, clicks? }`. |
| `rowActions?` | `(row) => DataTableRowAction[]` | none | Opens with the row menu and on context-click. |
| `onRowClick?` | `(row) => void` | none | |
| `summary?` | `boolean` | `true` | Totals above the table (published rows only). |
| `loading?` / `empty?` / `locale?` / `labels?` | | | |

### Logic (exported)

| Export | Description |
| --- | --- |
| `SOCIAL_PLATFORMS`, `socialRule(platform)` | The limits and requirements. |
| `socialLength(platform, text)` | Length the platform's way: code points, X links as 23. |
| `hashtagCount(text)` | Counts `#tags` including Arabic ones. |
| `checkSocialPost({ body, variants, platforms, media })` | One check per platform: length, remaining, level, problems. |
| `socialReady(checks)` | True when there is a target and nothing is wrong. |
| `socialEngagements`, `socialEngagementRate`, `summarizeSocialMetrics` | Metrics maths. |

## Examples

### Improve with AI

```tsx
import { SocialComposer, type SocialPost } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Assisted({ accounts, shorten }: { accounts: React.ComponentProps<typeof SocialComposer>["accounts"]; shorten: (t: string) => Promise<string> }) {
  const [post, setPost] = useState<SocialPost>({ body: "", variants: {}, accountIds: [], media: [], scheduledAt: null });
  return (
    <SocialComposer
      accounts={accounts}
      value={post}
      onValueChange={setPost}
      assistActions={[{ id: "shorten", label: "Shorten" }, { id: "hashtags", label: "Add hashtags" }]}
      onAssist={async (id, p) => id === "shorten" && setPost({ ...p, body: await shorten(p.body) })}
    />
  );
}
```

### Metrics with a row menu

```tsx
import { SocialMetricsTable } from "@fadymondy/nasaq/web";

export const Results = ({ rows }: { rows: React.ComponentProps<typeof SocialMetricsTable>["rows"] }) => (
  <SocialMetricsTable rows={rows} rowActions={(r) => [{ id: "open", label: "Open post", onSelect: () => window.open(`/posts/${r.id}`) }]} />
);
```

## Accessibility

- Accounts are buttons with `aria-pressed`, in a `fieldset` with a `legend`.
- Each counter is a `Progress` named "X character count"; the numbers are also written out beside it, and colour is never the only signal (the text says how many are over).
- Problems are plain text under the target.
- The table is the DataTable: arrow keys move between rows, Shift+F10 opens the row menu.

## RTL & i18n

- Arabic and English strings ship in; pass `labels` to override.
- Platform names stay in Latin script, as brands write them, and are shown as text, not logos. Handles sit in a `bdi`.
- Counts use Western digits unless your provider says otherwise. Arabic hashtags count.

## Styling & tokens

Cards, progress tones (`default`, `warning`, `danger`) and stat cards use the standard tokens. The layout is one column on narrow screens and two from `lg`.

## Do / Don't

- **Do** save `variants` as the text to send per platform; `checks[i].text` is exactly what goes out.
- **Do** run the same `checkSocialPost` on the server before publishing.
- **Don't** trim text to fit a limit silently.
- **Don't** show a platform's logo unless you have its official artwork.

## Related

- [AI states](../ai-states/README.md) · [DatePicker](../date-picker/README.md) · [DataTable](../data-table/README.md) · [Progress](../progress/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-marketing-social-composer--docs
