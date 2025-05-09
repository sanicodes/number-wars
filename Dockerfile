# Build stage
FROM node:18-alpine as builder

# Create necessary directories
RUN mkdir -p /app/client /app/server

# Set up client build
WORKDIR /app/client

# Copy client package files and install dependencies
COPY client/package.json client/package-lock.json ./
RUN npm install

# Copy client source code
COPY client/src ./src
COPY client/public ./public

# Build client
RUN npm run build

# Set up server build
WORKDIR /app/server

# Copy server package files and install dependencies
COPY server/package.json server/package-lock.json ./
RUN npm install --omit=dev

# Copy server source code
COPY server/src ./src

# Production stage
FROM node:18-alpine

# Create necessary directories
RUN mkdir -p /app/client/build /app/server

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