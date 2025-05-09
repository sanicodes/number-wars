# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files and install dependencies for client
COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm install

# Copy client source code
COPY client/ ./client/
WORKDIR /app/client

# Build client
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built client files
COPY --from=builder /app/client/build ./client/build

# Copy server files and install dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --omit=dev
COPY server/ ./server/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Start the server
CMD ["node", "index.js"] 