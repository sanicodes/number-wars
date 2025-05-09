# Use Node.js LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies
RUN npm install
RUN cd client && npm install
RUN cd server && npm install

# Copy source files
COPY client/ ./client/
COPY server/ ./server/

# Build client
RUN cd client && npm run build

# Move client build to server public directory
RUN mkdir -p server/public && cp -r client/build/* server/public/

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Start server
WORKDIR /app/server
CMD ["node", "src/index.js"] 