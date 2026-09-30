import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
export default withMDX({
  reactStrictMode: true,
  // /registry.json mirrors /r/registry.json so the shadcn CLI can be pointed at the site root.
  async rewrites() {
    return [{ source: "/registry.json", destination: "/r/registry.json" }];
  },
});
