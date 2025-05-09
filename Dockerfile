# Build stage
FROM node:16-alpine as builder

# Build client
WORKDIR /app
COPY package*.json ./
COPY client/ ./client/
COPY server/ ./server/
RUN npm run install:all
RUN cd client && npm run build

# Production stage
FROM node:16-alpine
WORKDIR /app

# Copy package files and install server dependencies
COPY package*.json ./
COPY server/ ./server/
RUN cd server && npm install

# Copy client build
COPY --from=builder /app/client/build ./server/public

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app/server
CMD ["node", "src/index.js"] 