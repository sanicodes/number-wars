# Build stage
FROM node:18-alpine as builder

# Create necessary directories
RUN mkdir -p /app/client /app/server

# Set up client build
WORKDIR /app/client

# Copy entire client directory
COPY client/ ./

# Install dependencies and build
RUN npm install
RUN npm run build

# Set up server build
WORKDIR /app/server

# Copy entire server directory
COPY server/ ./

# Install production dependencies
RUN npm install --omit=dev

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