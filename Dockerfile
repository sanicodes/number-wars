# syntax=docker/dockerfile:1

# Build stage
FROM node:16-alpine as builder

# Set environment variables for build
ENV NODE_ENV=production
ENV CI=true
ENV GENERATE_SOURCEMAP=false

# Set up client build
WORKDIR /app

# Copy everything first
COPY . .

# Install and build client
WORKDIR /app/client
RUN npm install --legacy-peer-deps
RUN npm run build

# Install server dependencies
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