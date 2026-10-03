# Docs site (docs.nasaqui.com): the Next.js docs with live previews, plus the shadcn registry at /r.
# Build context is the repo root: docker build -f deploy/site.Dockerfile .
FROM node:24-bookworm-slim AS build
WORKDIR /repo
ENV CI=1 NODE_OPTIONS=--max-old-space-size=6144 NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@11.24.0
COPY . .
RUN pnpm install --frozen-lockfile
# @fadymondy/nasaq builds nasaq.css and the Alpine runtime the previews load; the site build syncs them into public/.
RUN pnpm turbo run build --filter=@fadymondy/nasaq --filter=@nasaq/site

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=8080 NEXT_TELEMETRY_DISABLED=1
COPY --from=build /repo/apps/site/.next/standalone ./
COPY --from=build /repo/apps/site/.next/static ./apps/site/.next/static
COPY --from=build /repo/apps/site/public ./apps/site/public
USER node
EXPOSE 8080
CMD ["node", "apps/site/server.js"]
