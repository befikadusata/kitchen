# Build stage
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/schema.sql ./
COPY --from=builder /app/seed.ts ./
COPY --from=builder /app/db.ts ./
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src/utils ./src/utils

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
