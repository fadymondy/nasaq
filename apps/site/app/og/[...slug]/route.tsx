import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { source } from "@/lib/source";

// The Nasaq dark surface, text and brand mint (app/global.css); next/og cannot read CSS variables.
const C = {
  bg: "#0E1A3C", // nasaq-lint-ignore
  fg: "#F0EBE1", // nasaq-lint-ignore
  muted: "#8A97B8", // nasaq-lint-ignore
  brand: "#4CC495", // nasaq-lint-ignore
};

// Rendered on first request and cached by the edge; prerendering 400+ images would only slow the build.
export const dynamic = "force-dynamic";

let mark: Promise<string> | null = null;
const markUri = () =>
  (mark ??= readFile(join(process.cwd(), "public/brand/nasaq-mark-on-dark.svg"), "utf8").then(
    (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
  ));

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await ctx.params;
  const path = slug.join("/").replace(/\.png$/, "");
  const page = path === "index" ? null : source.getPage(path.split("/"));
  if (path !== "index" && !page) return new Response("Not found", { status: 404 });
  const title = page?.data.title ?? "Nasaq Documentation";
  const description = page?.data.description ?? "One product language, every surface.";
  const section = path.startsWith("components/groups/") ? "Component group" : path.startsWith("components/") ? "Component" : path.startsWith("guides/") ? "Guide" : "docs.nasaqui.com";

  const image = new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 72, background: C.bg, color: C.fg }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={await markUri()} width={64} height={64} alt="" />
          <span style={{ fontSize: 36, fontWeight: 700 }}>Nasaq</span>
          <span style={{ fontSize: 28, color: C.brand, marginLeft: 12 }}>{section}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <span style={{ fontSize: title.length > 28 ? 64 : 80, fontWeight: 700, lineHeight: 1.1 }}>{title}</span>
          <span style={{ fontSize: 30, color: C.muted, lineHeight: 1.4 }}>{description.length > 160 ? `${description.slice(0, 157)}…` : description}</span>
        </div>
        <span style={{ fontSize: 24, color: C.brand }}>React · shadcn · Vue · Blade · HTML + Alpine.js</span>
      </div>
    ),
    { width: 1200, height: 630 },
  );
  image.headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800");
  return image;
}
