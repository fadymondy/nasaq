import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
export default withMDX({
  reactStrictMode: true,
  // deploy/site.Dockerfile runs .next/standalone (traced from the workspace root, which Next finds by the lockfile).
  output: "standalone",
  // NEXT_BUILD_CPUS caps the static-generation workers so the Docker build fits a small server.
  ...(process.env.NEXT_BUILD_CPUS ? { experimental: { cpus: Number(process.env.NEXT_BUILD_CPUS) } } : {}),
  // /registry.json mirrors /r/registry.json so the shadcn CLI can be pointed at the site root.
  async rewrites() {
    return [{ source: "/registry.json", destination: "/r/registry.json" }];
  },
  async headers() {
    const day = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
    return [
      { source: "/nasaq/:path*", headers: [{ key: "Cache-Control", value: day }] },
      { source: "/preview/:path*", headers: [{ key: "Cache-Control", value: day }, { key: "X-Robots-Tag", value: "noindex" }] },
      { source: "/r/:path*", headers: [{ key: "Cache-Control", value: day }, { key: "Access-Control-Allow-Origin", value: "*" }] },
    ];
  },
});
