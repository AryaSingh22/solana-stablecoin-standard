FROM node:20-slim AS builder
WORKDIR /app
COPY services/shared ./services/shared
COPY services/indexer ./services/indexer
WORKDIR /app/services/shared
RUN npm install && npm run build 2>/dev/null || true
WORKDIR /app/services/indexer
RUN npm install && npm run build

FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/services/shared ./services/shared
COPY --from=builder /app/services/indexer/dist ./services/indexer/dist
COPY --from=builder /app/services/indexer/node_modules ./services/indexer/node_modules
COPY --from=builder /app/services/indexer/package.json ./services/indexer/
RUN cd services/shared && npx prisma generate
EXPOSE 3002
WORKDIR /app/services/indexer
CMD ["node", "dist/index.js"]
