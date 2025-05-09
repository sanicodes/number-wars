# syntax=docker/dockerfile:1

# Build stage
FROM node:16-alpine as builder

# Set environment variables for build
ENV NODE_ENV=production
ENV CI=true
ENV GENERATE_SOURCEMAP=false

# Install debugging tools
RUN apk add --no-cache tree

# Set up build directory
WORKDIR /app

# Debug: Show initial state
RUN pwd && echo "Initial directory structure:" && ls -la

# Copy the entire project
COPY . .

# Debug: Show copied files
RUN echo "After copying files:" && ls -la && \
    echo "\nClient directory:" && ls -la client/ && \
    echo "\nServer directory:" && ls -la server/

# Build client
WORKDIR /app/client
RUN echo "Building client..." && \
    npm install --legacy-peer-deps && \
    NODE_ENV=production npm run build

# Build server
WORKDIR /app/server
RUN echo "Building server..." && \
    npm install --omit=dev

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