// The landing page at mcp.nasaqui.com: same palette, logo, nav and light/dark behaviour as docs.nasaqui.com
// (apps/site/app/global.css), in one self-contained HTML response so the server needs no static build.
import { readFileSync } from "node:fs";
import { URLS } from "./catalog.mjs";

const asset = (name) => readFileSync(new URL(`../assets/${name}`, import.meta.url), "utf8");

/** The official Nasaq marks and favicon (packages/brands, via apps/site/public/brand), served unchanged. */
export const ASSETS = {
  "/brand/nasaq-mark.svg": asset("nasaq-mark.svg"),
  "/brand/nasaq-mark-on-dark.svg": asset("nasaq-mark-on-dark.svg"),
  "/favicon.svg": asset("favicon.svg"),
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Lucide icon paths (ISC), drawn with stroke="currentColor".
const ICON = {
  list: '<path d="M3 5h.01M3 12h.01M3 19h.01M8 5h13M8 12h13M8 19h13"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.34-4.34"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  book: '<path d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2"/>',
  rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-14.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
  arrow: '<path d="M7 7h10v10M7 17 17 7"/>',
};
const icon = (name, cls = "icon") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

const TOOLS = [
  ["list_components", "list", "Every component with its group and one-line summary."],
  ["search_components", "search", "Ranks components for a need described in plain words."],
  ["get_component", "box", "A component's manual: props, examples, accessibility and RTL rules, plus its source per stack."],
  ["get_foundation", "book", "The design rules behind the components: colour roles, type, spacing, motion and more."],
  ["list_tokens", "palette", "The --nq-* design tokens: colours, spacing, radius and type sizes."],
  ["get_setup", "rocket", "How to install Nasaq for React, shadcn, Vue 3, Laravel Blade or HTML + Alpine.js."],
];

const clients = (mcp) => [
  ["Claude Code", "bash", `claude mcp add --transport http nasaq ${mcp}`, "Run once in your terminal."],
  ["Claude Desktop", "text", mcp, "Settings → Connectors → Add custom connector, then paste the URL. Works on claude.ai too."],
  ["Cursor", "json", JSON.stringify({ mcpServers: { nasaq: { url: mcp } } }, null, 2), "Add to ~/.cursor/mcp.json or .cursor/mcp.json in your project."],
  ["VS Code", "json", JSON.stringify({ servers: { nasaq: { type: "http", url: mcp } } }, null, 2), "Add to .vscode/mcp.json, then start the server from the MCP view."],
  ["Windsurf", "json", JSON.stringify({ mcpServers: { nasaq: { serverUrl: mcp } } }, null, 2), "Add to ~/.codeium/windsurf/mcp_config.json."],
  ["Offline (stdio)", "bash", "npx -y @fadymondy/nasaq-mcp", "Runs the same server locally from npm. Use it as the command in any MCP client."],
];

const NAV = [
  ["Guides", `${URLS.docs}/guides/get-started`],
  ["Components", `${URLS.docs}/components`],
  ["Templates", `${URLS.docs}/templates`],
  ["Lab", URLS.lab],
];

// The docs palette, mirrored from apps/site/app/global.css.
const CSS = `
:root{--bg:#f7f4ec;--fg:#0e1a3c;--muted:#ede7db;--muted-fg:#6e6551;--card:#faf8f3;--border:#ded5c4;--primary:#15694a;--primary-fg:#f7f4ec;--accent:#e4ede6;--code:#f0ebe1;color-scheme:light}
:root.dark{--bg:#0e1a3c;--fg:#f0ebe1;--muted:#1a2747;--muted-fg:#8a97b8;--card:#132147;--border:#25355c;--primary:#4cc495;--primary-fg:#0e1a3c;--accent:#1a3a4a;--code:#0b1530;color-scheme:dark}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 Inter,ui-sans-serif,system-ui,sans-serif;min-height:100vh;display:flex;flex-direction:column}
a{color:inherit;text-decoration:none}code,pre{font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
.icon{width:1.1rem;height:1.1rem;flex:none}
.wrap{width:100%;max-width:72rem;margin-inline:auto;padding-inline:1rem}
header.top{position:sticky;top:0;z-index:10;border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--bg) 85%,transparent);backdrop-filter:blur(8px)}
header.top .wrap{display:flex;align-items:center;gap:1.5rem;height:3.5rem}
.brand{display:flex;align-items:center;gap:.5rem;font-weight:600}.brand img{width:24px;height:24px}
.brand .tag{font-size:.75rem;font-weight:500;color:var(--primary);border:1px solid var(--border);border-radius:999px;padding:0 .5rem}
nav.links{display:flex;gap:.25rem;flex:1}nav.links a{padding:.375rem .625rem;border-radius:.5rem;font-size:.875rem;color:var(--muted-fg)}nav.links a:hover{color:var(--fg);background:var(--muted)}
.actions{display:flex;align-items:center;gap:.5rem}
.btn-icon{display:inline-flex;align-items:center;justify-content:center;width:2.25rem;height:2.25rem;border-radius:.5rem;border:1px solid transparent;background:none;color:var(--muted-fg);cursor:pointer}.btn-icon:hover{color:var(--fg);background:var(--muted)}
.dark .only-light,:root:not(.dark) .only-dark{display:none}
main{flex:1}
.hero{display:flex;flex-direction:column;align-items:center;text-align:center;gap:1rem;padding-block:4.5rem 3rem}
.hero img{width:56px;height:56px}
h1{margin:0;font-size:clamp(2.25rem,5vw,3rem);line-height:1.1;letter-spacing:-.025em}
.lead{margin:0;max-width:42rem;font-size:1.125rem;color:var(--muted-fg)}
.endpoint{display:flex;align-items:center;gap:.5rem;width:100%;max-width:36rem;margin-top:.5rem;padding:.375rem .375rem .375rem 1rem;border:1px solid var(--border);border-radius:.75rem;background:var(--card);text-align:start}
.endpoint code{flex:1;overflow:auto;white-space:nowrap;font-size:.9rem}
.pill{display:inline-flex;align-items:center;gap:.375rem;font-size:.75rem;font-weight:500;color:var(--primary);background:var(--accent);border-radius:999px;padding:.125rem .625rem}
.copy{display:inline-flex;align-items:center;gap:.375rem;border:1px solid var(--border);background:var(--bg);color:var(--fg);border-radius:.5rem;padding:.375rem .625rem;font:inherit;font-size:.8rem;cursor:pointer}.copy:hover{border-color:var(--primary)}
.copy .ok{display:none}.copy.done .ok{display:block}.copy.done .cp{display:none}
.stats{display:flex;flex-wrap:wrap;justify-content:center;gap:.5rem 1.5rem;margin-top:.25rem;font-size:.9rem;color:var(--muted-fg)}.stats b{color:var(--fg);font-variant-numeric:tabular-nums}
section{display:flex;flex-direction:column;gap:1rem;padding-block:2rem}
h2{margin:0;font-size:1.25rem}.sub{margin:0;color:var(--muted-fg);font-size:.95rem}
.tabs{border:1px solid var(--border);border-radius:.75rem;background:var(--card);overflow:hidden}
.tablist{display:flex;overflow-x:auto;border-bottom:1px solid var(--border);padding:.25rem;gap:.25rem}
.tablist button{border:0;background:none;color:var(--muted-fg);font:inherit;font-size:.875rem;padding:.375rem .75rem;border-radius:.5rem;cursor:pointer;white-space:nowrap}
.tablist button[aria-selected=true]{background:var(--accent);color:var(--primary);font-weight:500}
.panel{padding:1rem;display:flex;flex-direction:column;gap:.75rem}.panel[hidden]{display:none}
.panel p{margin:0;font-size:.9rem;color:var(--muted-fg)}
.code{position:relative}.code pre{margin:0;padding:.875rem 1rem;padding-inline-end:5.5rem;background:var(--code);border:1px solid var(--border);border-radius:.5rem;overflow:auto;font-size:.85rem;line-height:1.55}
.code .copy{position:absolute;top:.5rem;inset-inline-end:.5rem}
.grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));padding:0;margin:0;list-style:none}
.card{display:flex;flex-direction:column;gap:.5rem;height:100%;padding:1.25rem;border:1px solid var(--border);border-radius:.75rem;background:var(--card);transition:border-color .15s,background .15s}
a.card:hover{border-color:color-mix(in srgb,var(--primary) 50%,transparent);background:color-mix(in srgb,var(--accent) 40%,var(--card))}
.card .icon{color:var(--primary);width:1.25rem;height:1.25rem}.card code{font-size:.9rem;font-weight:600}.card span{font-size:.875rem;color:var(--muted-fg)}
.steps{counter-reset:s;display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));padding:0;margin:0;list-style:none}
.steps li{counter-increment:s;display:flex;gap:.75rem;font-size:.9rem;color:var(--muted-fg)}.steps li::before{content:counter(s);flex:none;display:grid;place-items:center;width:1.75rem;height:1.75rem;border-radius:999px;background:var(--accent);color:var(--primary);font-weight:600;font-size:.8rem}
.steps b{color:var(--fg)}
footer{border-top:1px solid var(--border);margin-top:2rem}footer .wrap{display:flex;flex-wrap:wrap;gap:.5rem 1.5rem;justify-content:space-between;padding-block:1.5rem;font-size:.85rem;color:var(--muted-fg)}footer a:hover{color:var(--fg)}
footer nav{display:flex;flex-wrap:wrap;gap:1rem}
@media (max-width:640px){nav.links{display:none}header.top .wrap{justify-content:space-between}}
`;

const JS = `
(()=>{const r=document.documentElement;
document.getElementById("theme").onclick=()=>{const d=!r.classList.contains("dark");r.classList.toggle("dark",d);localStorage.setItem("theme",d?"dark":"light")};
document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=async()=>{const t=b.dataset.copy?document.getElementById(b.dataset.copy).textContent:"";await navigator.clipboard.writeText(t);b.classList.add("done");setTimeout(()=>b.classList.remove("done"),1500)});
const tabs=[...document.querySelectorAll("[role=tab]")];tabs.forEach((t,i)=>{t.onclick=()=>sel(i);t.onkeydown=e=>{if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();const n=(i+(e.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;sel(n);tabs[n].focus()}}});
function sel(i){tabs.forEach((t,j)=>{t.setAttribute("aria-selected",i===j);t.tabIndex=i===j?0:-1;document.getElementById(t.getAttribute("aria-controls")).hidden=i!==j})}})();
`;

const copyBtn = (id, label = "Copy") =>
  `<button type="button" class="copy" data-copy="${id}" aria-label="${label}">${icon("copy", "icon cp")}${icon("check", "icon ok")}<span>${label}</span></button>`;

/** The full HTML page. `counts` comes from the catalogue; `version` is the server's package version. */
export function landing(counts, version) {
  const mcp = URLS.mcp;
  const title = "Nasaq MCP server: teach your AI assistant the Nasaq design system";
  const description = `Free, public MCP server for Nasaq: ${counts.components} components, ${counts.foundations} foundations docs and ${counts.tokens} design tokens for Claude, Cursor, VS Code and any MCP client. No sign-in.`;
  const site = mcp.replace(/\/mcp$/, "");
  const ld = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Nasaq MCP server",
    url: `${site}/`,
    description,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    softwareVersion: version,
    license: "https://opensource.org/licenses/MIT",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    isPartOf: { "@type": "WebSite", name: "Nasaq", url: URLS.docs },
    author: { "@type": "Person", name: "Fady Mondy", url: "https://github.com/fadymondy" },
    sameAs: [URLS.repo, "https://www.npmjs.com/package/@fadymondy/nasaq-mcp"],
  };
  const list = clients(mcp);
  return `<!doctype html>
<html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${site}/">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f7f4ec"><meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0e1a3c">
<meta property="og:type" content="website"><meta property="og:site_name" content="Nasaq"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${site}/"><meta property="og:image" content="${URLS.docs}/og/guides/mcp-server.png">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${URLS.docs}/og/guides/mcp-server.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap">
<script>(()=>{const t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")})()</script>
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
</head><body>
<header class="top"><div class="wrap">
  <a class="brand" href="${URLS.docs}"><img class="only-light" src="/brand/nasaq-mark.svg" alt="" width="24" height="24"><img class="only-dark" src="/brand/nasaq-mark-on-dark.svg" alt="" width="24" height="24">Nasaq <span class="tag">MCP</span></a>
  <nav class="links" aria-label="Nasaq">${NAV.map(([t, h]) => `<a href="${h}">${t}</a>`).join("")}</nav>
  <div class="actions">
    <button type="button" class="btn-icon" id="theme" aria-label="Toggle theme">${icon("sun", "icon only-dark")}${icon("moon", "icon only-light")}</button>
    <a class="btn-icon" href="${URLS.repo}" aria-label="GitHub">${icon("github")}</a>
  </div>
</div></header>
<main class="wrap">
  <div class="hero">
    <img class="only-light" src="/brand/nasaq-mark.svg" alt="" width="56" height="56"><img class="only-dark" src="/brand/nasaq-mark-on-dark.svg" alt="" width="56" height="56">
    <span class="pill">Free · public · no sign-in</span>
    <h1>Nasaq MCP server</h1>
    <p class="lead">Teach your AI assistant Nasaq. It reads every component manual, the design foundations and the tokens, then writes UI for React, shadcn, Vue 3, Laravel Blade or HTML + Alpine.js the way Nasaq expects.</p>
    <div class="endpoint"><code id="endpoint">${mcp}</code>${copyBtn("endpoint")}</div>
    <div class="stats"><span><b>${counts.components}</b> components</span><span><b>${counts.foundations}</b> foundations docs</span><span><b>${counts.tokens}</b> design tokens</span><span>Streamable HTTP · v${esc(version)}</span></div>
  </div>

  <section aria-labelledby="connect">
    <h2 id="connect">Connect your client</h2>
    <div class="tabs">
      <div class="tablist" role="tablist" aria-label="MCP clients">${list
        .map(([name], i) => `<button type="button" role="tab" id="tab-${i}" aria-controls="panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${name}</button>`)
        .join("")}</div>
      ${list
        .map(
          ([, , code, note], i) =>
            `<div class="panel" role="tabpanel" id="panel-${i}" aria-labelledby="tab-${i}"${i === 0 ? "" : " hidden"}><p>${esc(note)}</p><div class="code"><pre id="code-${i}">${esc(code)}</pre>${copyBtn(`code-${i}`)}</div></div>`,
        )
        .join("")}
    </div>
  </section>

  <section aria-labelledby="tools">
    <h2 id="tools">Tools</h2>
    <p class="sub">Six read-only tools. Your assistant calls them on its own when you ask for UI.</p>
    <ul class="grid">${TOOLS.map(([name, ic, text]) => `<li><div class="card">${icon(ic)}<code>${name}</code><span>${text}</span></div></li>`).join("")}</ul>
  </section>

  <section aria-labelledby="how">
    <h2 id="how">How your assistant uses it</h2>
    <ol class="steps">
      <li><span><b>get_setup</b> once, for the stack you are on.</span></li>
      <li><span><b>search_components</b> or <b>list_components</b> to find the right piece.</span></li>
      <li><span><b>get_component</b> for its manual, then it writes code with only the documented props and tokens.</span></li>
    </ol>
  </section>

  <section aria-labelledby="more">
    <h2 id="more">Keep going</h2>
    <ul class="grid">
      <li><a class="card" href="${URLS.docs}/guides/mcp-server">${icon("book")}<code>MCP guide</code><span>Setup for every client, the tools in detail and troubleshooting.</span></a></li>
      <li><a class="card" href="${URLS.docs}/components">${icon("box")}<code>Components</code><span>Browse all ${counts.components} components with live previews and code for every stack.</span></a></li>
      <li><a class="card" href="${URLS.docs}/templates">${icon("palette")}<code>Website templates</code><span>Complete bilingual sites built with Nasaq, from the CircleXO template store.</span></a></li>
    </ul>
  </section>
</main>
<footer><div class="wrap">
  <span>Nasaq (نسق) · MIT · <a href="/health">Status</a></span>
  <nav aria-label="More">${[["Docs", URLS.docs], ["npm", "https://www.npmjs.com/package/@fadymondy/nasaq-mcp"], ["GitHub", URLS.repo], ["nasaqui.com", URLS.landing]].map(([t, h]) => `<a href="${h}">${t}</a>`).join("")}</nav>
</div></footer>
<script>${JS}</script>
</body></html>
`;
}
