import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();
const dev = process.env.NODE_ENV !== "production";

/** @type {import('next').NextConfig} */
export default withMDX({
  reactStrictMode: true,
  // deploy/site.Dockerfile runs .next/standalone (traced from the workspace root, which Next finds by the lockfile).
  output: "standalone",
  // dev.nasaqui.com proxies the local dev server (win-tunnel); Next blocks dev assets from other origins otherwise.
  allowedDevOrigins: ["dev.nasaqui.com"],
  // NEXT_BUILD_CPUS caps the static-generation workers so the Docker build fits a small server.
  ...(process.env.NEXT_BUILD_CPUS ? { experimental: { cpus: Number(process.env.NEXT_BUILD_CPUS) } } : {}),
  // /registry.json mirrors /r/registry.json so the shadcn CLI can be pointed at the site root.
  // The docs used to live under /docs; the site is the docs now.
  async redirects() {
    return [
      { source: "/docs", destination: "/", permanent: true },
      { source: "/docs/:path*", destination: "/:path*", permanent: true },
    ];
  },
  async rewrites() {
    return [{ source: "/registry.json", destination: "/r/registry.json" }];
  },
  async headers() {
    // In dev, long cache headers would let Cloudflare serve stale files on dev.nasaqui.com.
    if (dev) return [{ source: "/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "CDN-Cache-Control", value: "no-store" }] }];
    const day = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
    return [
      { source: "/nasaq/:path*", headers: [{ key: "Cache-Control", value: day }] },
      { source: "/preview/:path*", headers: [{ key: "Cache-Control", value: day }, { key: "X-Robots-Tag", value: "noindex" }] },
      { source: "/code/:path*", headers: [{ key: "Cache-Control", value: day }, { key: "X-Robots-Tag", value: "noindex" }] },
      { source: "/r/:path*", headers: [{ key: "Cache-Control", value: day }, { key: "Access-Control-Allow-Origin", value: "*" }] },
    ];
  },
});
