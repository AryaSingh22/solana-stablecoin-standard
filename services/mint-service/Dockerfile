FROM node:20-slim AS builder
WORKDIR /app
COPY services/shared ./services/shared
COPY services/mint-service ./services/mint-service
WORKDIR /app/services/shared
RUN npm install && npm run build 2>/dev/null || true
WORKDIR /app/services/mint-service
RUN npm install && npm run build

FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/services/shared ./services/shared
COPY --from=builder /app/services/mint-service/dist ./services/mint-service/dist
COPY --from=builder /app/services/mint-service/node_modules ./services/mint-service/node_modules
COPY --from=builder /app/services/mint-service/package.json ./services/mint-service/
RUN cd services/shared && npx prisma generate
EXPOSE 3001
WORKDIR /app/services/mint-service
CMD ["node", "dist/index.js"]
