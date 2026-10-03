# Hosted MCP (mcp.nasaqui.com/mcp): stateless streamable HTTP over the built catalog.
# Build context is the repo root: docker build -f deploy/mcp.Dockerfile .
FROM node:24-bookworm-slim AS build
WORKDIR /repo
ENV CI=1
RUN npm install -g pnpm@11.24.0
COPY . .
RUN pnpm install --frozen-lockfile --filter @fadymondy/nasaq-mcp... --filter @nasaq/tokens...
RUN pnpm --filter @nasaq/tokens build
RUN node packages/mcp/scripts/build-catalog.mjs
RUN pnpm --filter @fadymondy/nasaq-mcp deploy --prod --legacy /out

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
COPY --from=build /out ./
COPY --from=build /repo/packages/mcp/catalog.json ./catalog.json
USER node
EXPOSE 8080
CMD ["node", "src/http.mjs"]
