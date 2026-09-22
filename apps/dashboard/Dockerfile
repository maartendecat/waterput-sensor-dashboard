# syntax=docker/dockerfile:1

# Debian-slim en niet Alpine: better-sqlite3 heeft kant-en-klare binaries voor
# linux/arm64 op glibc, maar niet voor musl. Op Alpine zou elke build onder
# QEMU de module van nul moeten compileren.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# De ster maakt de lockfile optioneel: is hij er, dan is de build
# reproduceerbaar via npm ci; is hij er nog niet, dan lost npm zelf op.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=Europe/Brussels \
    WATERPUT_DB_PATH=/data/waterput.db

RUN groupadd --system waterput \
 && useradd --system --gid waterput --home /app waterput \
 && mkdir -p /data \
 && chown waterput:waterput /data

# De standalone-uitvoer bevat de server plus enkel de getraceerde modules.
COPY --from=build --chown=waterput:waterput /app/.next/standalone ./
COPY --from=build --chown=waterput:waterput /app/.next/static ./.next/static

USER waterput
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/config').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
