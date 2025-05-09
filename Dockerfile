# syntax=docker/dockerfile:1

# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy client files
COPY client client/

# Build client
WORKDIR /app/client
RUN npm install
RUN npm run build

# Copy and build server
WORKDIR /app
COPY server server/
WORKDIR /app/server
RUN npm install --omit=dev

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built client files
COPY --from=builder /app/client/build ./client/build

# Copy server files
COPY --from=builder /app/server ./server

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Start the server
WORKDIR /app/server
CMD ["node", "src/index.js"] 