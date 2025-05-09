# Build stage
FROM node:18-alpine as builder

# Set up client build
WORKDIR /app/client

# Copy client package files and install dependencies
COPY client/package*.json ./
RUN npm install

# Copy client source code
COPY client/ ./

# Build client
RUN npm run build

# Set up server build
WORKDIR /app/server

# Copy server package files and install dependencies
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy server source code
COPY server/ ./

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
CMD ["node", "index.js"] 