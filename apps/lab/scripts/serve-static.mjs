#!/usr/bin/env node
// A dependency-free static server for the built lab (apps/lab/storybook-static).
//
//   node apps/lab/scripts/serve-static.mjs                 # http://127.0.0.1:6108
//   PORT=6108 HOST=0.0.0.0 node apps/lab/scripts/serve-static.mjs
//   node apps/lab/scripts/serve-static.mjs --dir path/to/storybook-static --port 6108 --quiet
//
// Why not `npx serve`: the folder needs different headers per path, and the host sits behind Cloudflare,
// which rewrites `Cache-Control: no-cache` into a 4-hour edge cache. The policy here is explicit:
//   /assets/*  and other hash-named files     public, max-age=31536000, immutable
//   /store/*   demo images (not hashed)       public, max-age=3600
//   everything else (index.html, iframe.html, index.json, project.json, sb-*, registry files)
//                                             private, no-store  (+ CDN-Cache-Control: no-store)
//   /r/*.json and /registry.json              the above, plus CORS (Access-Control-Allow-Origin: *)
// Text is compressed once (brotli or gzip) and kept in memory. GET /healthz answers 200 for monitors.
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompress, gzip } from "node:zlib";
import { promisify } from "node:util";

const brotli = promisify(brotliCompress);
const gz = promisify(gzip);

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}
const ROOT = resolve(arg("dir") ?? process.env.DIR ?? join(dirname(fileURLToPath(import.meta.url)), "../storybook-static"));
const PORT = Number(arg("port") ?? process.env.PORT ?? 6108);
const HOST = arg("host") ?? process.env.HOST ?? "127.0.0.1";
const QUIET = process.argv.includes("--quiet") || process.env.QUIET === "1";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".wasm": "application/wasm",
};
const COMPRESSIBLE = /^(text\/|application\/json|image\/svg)/;
// Vite / Rolldown name chunks `name-<8+ chars of base64url>.ext`; Storybook keeps them under /assets.
const HASHED = /-[A-Za-z0-9_-]{8,}\.(?:js|mjs|css|woff2?|ttf|png|jpe?g|webp|avif|svg|wasm|map)$/;

function cacheHeaders(path) {
  if (path.startsWith("/assets/") && HASHED.test(path)) return { "Cache-Control": "public, max-age=31536000, immutable" };
  if (path.startsWith("/store/")) return { "Cache-Control": "public, max-age=3600" };
  return { "Cache-Control": "private, no-store", "CDN-Cache-Control": "no-store" };
}
const isRegistry = (path) => path === "/registry.json" || (path.startsWith("/r/") && path.endsWith(".json"));

const compressed = new Map(); // "<enc>:<path>:<mtimeMs>:<size>" -> Buffer
async function encode(enc, file, info) {
  const key = `${enc}:${file}:${info.mtimeMs}:${info.size}`;
  let buf = compressed.get(key);
  if (!buf) {
    const raw = await readFile(file);
    buf = enc === "br" ? await brotli(raw, { params: { 1: 5 } }) : await gz(raw, { level: 6 });
    if (compressed.size > 2000) compressed.clear();
    compressed.set(key, buf);
  }
  return buf;
}

async function resolveFile(urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (rel.includes("\0")) return null;
  const file = normalize(join(ROOT, rel));
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return null; // path traversal
  let info = await stat(file).catch(() => null);
  if (info?.isDirectory()) {
    const index = join(file, "index.html");
    info = await stat(index).catch(() => null);
    return info ? { file: index, info } : null;
  }
  return info ? { file, info } : null;
}

const server = createServer(async (req, res) => {
  const started = Date.now();
  const url = new URL(req.url ?? "/", "http://x");
  const path = url.pathname;
  const finish = (status) => {
    if (!QUIET) console.log(`${new Date().toISOString()} ${req.method} ${path} ${status} ${Date.now() - started}ms`);
  };
  const send = (status, headers, body) => {
    res.writeHead(status, { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", ...headers });
    res.end(req.method === "HEAD" ? undefined : body);
    finish(status);
  };

  try {
    if (path === "/healthz") return send(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }, '{"status":"ok"}');

    const cors = isRegistry(path)
      ? { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS", "Access-Control-Allow-Headers": "*", "Access-Control-Max-Age": "86400" }
      : {};
    if (req.method === "OPTIONS") return send(204, { ...cors, Allow: "GET, HEAD, OPTIONS" });
    if (req.method !== "GET" && req.method !== "HEAD") return send(405, { Allow: "GET, HEAD, OPTIONS", "Content-Type": "text/plain" }, "Method Not Allowed");

    const hit = await resolveFile(path);
    if (!hit) return send(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }, "Not found");
    const { file, info } = hit;
    const type = TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
    const headers = { "Content-Type": type, Vary: "Accept-Encoding", ...cacheHeaders(path), ...cors };

    const accept = String(req.headers["accept-encoding"] ?? "");
    const enc = COMPRESSIBLE.test(type) && info.size > 1024 ? (/\bbr\b/.test(accept) ? "br" : /\bgzip\b/.test(accept) ? "gzip" : null) : null;
    if (enc) {
      const body = await encode(enc, file, info);
      return send(200, { ...headers, "Content-Encoding": enc, "Content-Length": body.length }, body);
    }
    res.writeHead(200, { "X-Content-Type-Options": "nosniff", ...headers, "Content-Length": info.size });
    finish(200);
    if (req.method === "HEAD") return res.end();
    createReadStream(file).on("error", () => res.destroy()).pipe(res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(500, { "Content-Type": "text/plain" }, "Internal Server Error");
    else res.destroy();
  }
});

const ok = await stat(join(ROOT, "index.html")).catch(() => null);
if (!ok) {
  console.error(`serve-static: ${ROOT} has no index.html. Build it first: pnpm --filter @nasaq/lab build`);
  process.exit(1);
}
server.keepAliveTimeout = 65_000;
server.listen(PORT, HOST, () => console.log(`serve-static: ${ROOT} on http://${HOST}:${PORT}`));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.close(() => process.exit(0)));
