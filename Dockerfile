# syntax=docker/dockerfile:1

# Build stage
FROM node:16-alpine as builder

# Set environment variables for build
ENV NODE_ENV=production
ENV CI=true
ENV GENERATE_SOURCEMAP=false

# Set up build directory
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy client and server directories
COPY client client/
COPY server server/

# Build client
WORKDIR /app/client
RUN ls -la && \
    npm install --legacy-peer-deps && \
    npm run build

# Build server
WORKDIR /app/server
RUN npm install --omit=dev

# Production stage
FROM node:16-alpine

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