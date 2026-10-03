#!/usr/bin/env node
// Nasaq MCP server over streamable HTTP. Public, read-only and stateless: every POST /mcp gets its own
// server + transport, answers with plain JSON (no SSE, so proxy buffering cannot stall it), and nothing
// is kept between requests. It serves only the bundled catalog.json; it never reads a file named by a client.
//
//   HOST (default 127.0.0.1)   PORT (default 3000)   MAX_BODY_BYTES (default 262144)
//   NASAQ_LIVE=1 reads the monorepo live instead of catalog.json (development only)
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { catalogProvider, createNasaqServer, pkg } from "./create-server.mjs";
import { ASSETS, landing } from "./landing.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};
const BASE = { ...CORS, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", "X-Accel-Buffering": "no" };

const rpcError = (code, message) => JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null });

function send(res, status, body, type = "application/json", extra = {}) {
  if (res.headersSent) return res.end();
  res.writeHead(status, { ...BASE, "Content-Type": `${type}; charset=utf-8`, ...extra });
  res.end(body);
}

class TooLarge extends Error {}

/** Reads the request body up to `limit` bytes. Rejects early on Content-Length, and while streaming. */
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers["content-length"]);
    if (declared > limit) return reject(new TooLarge());
    const chunks = [];
    let size = 0;
    let over = false;
    req.on("data", (chunk) => {
      if (over) return; // keep draining so the 413 can be delivered; the socket is closed after it
      size += chunk.length;
      if (size > limit) {
        over = true;
        chunks.length = 0;
        reject(new TooLarge());
      } else chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Builds the request handler. `catalog` is a function returning the catalogue. */
export function createHandler({ catalog, maxBodyBytes = 256 * 1024 } = {}) {
  const counts = () => {
    const c = catalog();
    return { components: c.components.length, foundations: c.foundations.length, tokens: c.tokens.length };
  };

  return async function handle(req, res) {
    let path;
    try {
      path = new URL(req.url ?? "/", "http://localhost").pathname.replace(/\/+$/, "") || "/";
    } catch {
      return send(res, 400, rpcError(-32600, "Bad request URL"));
    }

    if (req.method === "OPTIONS") return send(res, 204, "");

    if (path === "/health" && (req.method === "GET" || req.method === "HEAD")) {
      const c = catalog();
      return send(res, 200, JSON.stringify({ status: "ok", name: "nasaq-mcp", version: pkg.version, ...counts(), catalogGeneratedAt: c.generatedAt ?? null }));
    }

    if (path === "/" && (req.method === "GET" || req.method === "HEAD")) return send(res, 200, landing(counts(), pkg.version), "text/html");

    if (ASSETS[path] && (req.method === "GET" || req.method === "HEAD")) return send(res, 200, ASSETS[path], "image/svg+xml", { "Cache-Control": "public, max-age=86400" });

    if (path !== "/mcp") return send(res, 404, JSON.stringify({ error: "Not found. The MCP endpoint is POST /mcp." }));

    // Stateless: there is no session to resume (GET) or end (DELETE), and no server-initiated stream.
    if (req.method !== "POST") return send(res, 405, rpcError(-32000, "Method not allowed. POST JSON-RPC to /mcp."), "application/json", { Allow: "POST, OPTIONS" });

    let parsed;
    try {
      const raw = await readBody(req, maxBodyBytes);
      try {
        parsed = JSON.parse(raw);
      } catch {
        return send(res, 400, rpcError(-32700, "Parse error: body is not valid JSON"));
      }
    } catch (e) {
      if (e instanceof TooLarge) {
        res.once("finish", () => req.destroy());
        return send(res, 413, rpcError(-32600, `Request body exceeds ${maxBodyBytes} bytes`), "application/json", { Connection: "close" });
      }
      return send(res, 400, rpcError(-32600, "Could not read request body"));
    }
    if (parsed === null || typeof parsed !== "object") return send(res, 400, rpcError(-32600, "Invalid Request: expected a JSON-RPC object or batch"));

    const server = createNasaqServer(catalog);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });
    try {
      // The transport sets its own status and Content-Type; CORS and cache headers are set here first.
      for (const [k, v] of Object.entries(BASE)) res.setHeader(k, v);
      await server.connect(transport);
      await transport.handleRequest(req, res, parsed);
    } catch (e) {
      console.error(`[nasaq-mcp] ${new Date().toISOString()} request failed:`, e?.message ?? e);
      send(res, 500, rpcError(-32603, "Internal server error"));
    }
  };
}

/** Starts listening. Options fall back to HOST / PORT / MAX_BODY_BYTES. Resolves to the http.Server. */
export async function startHttp({ host = process.env.HOST || "127.0.0.1", port = Number(process.env.PORT ?? 3000), maxBodyBytes = Number(process.env.MAX_BODY_BYTES) || 256 * 1024, catalog } = {}) {
  const provider = catalog ?? catalogProvider({ snapshot: process.env.NASAQ_LIVE !== "1" });
  provider(); // fail fast if there is no catalogue
  const http = createServer(createHandler({ catalog: provider, maxBodyBytes }));
  // Behind Nginx Proxy Manager: keep idle connections open longer than its 60s upstream keep-alive.
  http.keepAliveTimeout = 65_000;
  http.headersTimeout = 66_000;
  http.requestTimeout = 30_000;
  await new Promise((resolve, reject) => {
    http.once("error", reject);
    http.listen(port, host, resolve);
  });
  const { port: bound } = http.address();
  console.error(`[nasaq-mcp] ${pkg.version} listening on http://${host}:${bound}/mcp (${provider().components.length} components, ${provider().mode})`);
  const stop = () => http.close(() => process.exit(0));
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  return http;
}

const isMain = () => {
  try {
    return process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
};
if (isMain()) await startHttp();
