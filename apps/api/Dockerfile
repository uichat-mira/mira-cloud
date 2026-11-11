# Exact Node runtime version, build on GitHub-hosted amd64 Actions; no VPS build tools.
FROM node:24.19.0-bookworm-slim AS compile
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @mira-cloud/api...
COPY apps/api/ apps/api/
RUN pnpm --filter @mira-cloud/api build && \
    pnpm --filter @mira-cloud/api deploy --legacy --prod /out

FROM node:24.19.0-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=compile --chown=node:node /out/ /app/
COPY --from=compile --chown=node:node /workspace/apps/api/dist/ /app/dist/
COPY --from=compile --chown=node:node /workspace/apps/api/drizzle/ /app/drizzle/
COPY --chown=node:node --chmod=0555 apps/api/deploy/entrypoint.sh /app/entrypoint.sh
USER node
EXPOSE 3000
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["api"]
