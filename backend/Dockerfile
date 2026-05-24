FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /app
RUN chown node:node /app

COPY --chown=node:node package.json pnpm-lock.yaml ./

USER node
RUN pnpm install --frozen-lockfile

COPY --chown=node:node . .

USER root
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Direktori untuk file dinamis (admin uploads + tools generations).
# Di compose, volume `porto_uploads` di-mount ke /app/public/uploads supaya
# data persist lintas container restart.
RUN mkdir -p /app/public/uploads/tools && chown -R node:node /app/public

USER node

ENV NODE_ENV=production
EXPOSE 4002

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:4002/ >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
