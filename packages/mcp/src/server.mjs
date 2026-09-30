#!/usr/bin/env node
// Nasaq MCP server. Default: stdio (`npx -y @fadymondy/nasaq-mcp`). With --http: the streamable HTTP server.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

if (process.argv.includes("--http")) {
  const { startHttp } = await import("./http.mjs");
  await startHttp();
} else {
  const { createNasaqServer, catalogProvider } = await import("./create-server.mjs");
  await createNasaqServer(catalogProvider()).connect(new StdioServerTransport());
}
