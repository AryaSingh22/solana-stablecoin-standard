FROM node:20-slim AS builder
WORKDIR /app
COPY services/shared ./services/shared
COPY services/webhook-service ./services/webhook-service
WORKDIR /app/services/shared
RUN npm install && npm run build 2>/dev/null || true
WORKDIR /app/services/webhook-service
RUN npm install && npm run build

FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/services/shared ./services/shared
COPY --from=builder /app/services/webhook-service/dist ./services/webhook-service/dist
COPY --from=builder /app/services/webhook-service/node_modules ./services/webhook-service/node_modules
COPY --from=builder /app/services/webhook-service/package.json ./services/webhook-service/
RUN cd services/shared && npx prisma generate
EXPOSE 3004
WORKDIR /app/services/webhook-service
CMD ["node", "dist/index.js"]
