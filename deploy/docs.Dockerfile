# Docs host (docs.nasaqui.com): the static Storybook plus the shadcn registry at /r.
# Build context is the repo root: docker build -f deploy/docs.Dockerfile .
FROM node:24-bookworm-slim AS build
WORKDIR /repo
ENV CI=1 NODE_OPTIONS=--max-old-space-size=4096
RUN npm install -g pnpm@11.24.0
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@nasaq/lab

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 QUIET=1 DIR=/app/storybook-static
COPY --from=build /repo/apps/lab/scripts/serve-static.mjs ./serve-static.mjs
COPY --from=build /repo/apps/lab/storybook-static ./storybook-static
USER node
EXPOSE 8080
CMD ["node", "serve-static.mjs"]
