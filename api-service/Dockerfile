# ---------- Étape 1 : compilation (jetée après le build) ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app

# OpenSSL est nécessaire à Prisma
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Étape 2 : image finale ----------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Dépendances de production uniquement
COPY package*.json ./
RUN npm ci --omit=dev

# Client Prisma + migrations (utiles pour "prisma migrate deploy")
COPY prisma ./prisma
RUN npx prisma generate

# Le code compilé
COPY --from=build /app/dist ./dist

# On ne tourne plus en root
USER node

EXPOSE 3000
CMD ["node", "dist/src/server.js"]
