# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    TZ=Europe/Brussels

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
 && npm cache clean --force
COPY --from=build /app/dist ./dist

# Draait als root: de container heeft een seriele poort van de host nodig en
# de groep die daar eigenaar van is (dialout) heeft niet overal hetzelfde GID.
# De container doet verder niets dan een register lezen en het resultaat POSTen.
CMD ["node", "dist/index.js"]
