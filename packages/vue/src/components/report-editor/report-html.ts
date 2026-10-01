// The viewer shows a text block's HTML (made by the rich text editor) without loading Tiptap. Only the tags the editor can make survive;
// everything else is unwrapped, and links keep only http, https, mailto and tel addresses.

const ALLOWED = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "S", "CODE", "PRE", "BLOCKQUOTE", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "A", "HR"]);
const SAFE_HREF = /^(https?:|mailto:|tel:|\/|#)/i;

export function sanitizeHtml(html: string): string {
  if (!html || typeof document === "undefined") return "";
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const walk = (node: Element) => {
    for (const child of [...node.children]) {
      walk(child);
      if (!ALLOWED.has(child.tagName)) {
        if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED"].includes(child.tagName)) child.remove();
        else child.replaceWith(...child.childNodes);
        continue;
      }
      for (const attr of [...child.attributes]) {
        const keep = child.tagName === "A" && (attr.name === "href" || attr.name === "title");
        if (!keep) child.removeAttribute(attr.name);
      }
      if (child.tagName === "A") {
        const href = child.getAttribute("href") ?? "";
        if (!SAFE_HREF.test(href.trim())) child.removeAttribute("href");
        else {
          child.setAttribute("rel", "noopener noreferrer");
          child.setAttribute("target", "_blank");
        }
      } else child.setAttribute("dir", "auto");
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
