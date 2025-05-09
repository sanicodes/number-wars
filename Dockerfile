# Build stage
FROM node:16-alpine as builder

# Build client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Production stage
FROM node:16-alpine
WORKDIR /app

# Copy server files
COPY server/package*.json ./
RUN npm install
COPY server/ ./

# Copy client build
COPY --from=builder /app/client/build ./public

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "src/index.js"] 