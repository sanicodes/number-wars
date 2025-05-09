# syntax=docker/dockerfile:1

# Build stage
FROM node:16-alpine as builder

# Set environment variables for build
ENV NODE_ENV=production
ENV CI=true
ENV GENERATE_SOURCEMAP=false

# Set up client build
WORKDIR /app/client

# Copy client package files first
COPY client/package.json client/package-lock.json ./

# Install client dependencies
RUN npm install --legacy-peer-deps

# Copy client source code
COPY client/src ./src
COPY client/public ./public

# Build client
RUN npm run build

# Set up server build
WORKDIR /app/server

# Copy server package files
COPY server/package.json server/package-lock.json ./

# Install server dependencies
RUN npm install --omit=dev

# Copy server source code
COPY server/src ./src

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