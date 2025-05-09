# Use Node.js LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd client && npm install
RUN cd server && npm install

# Copy the rest of the files
COPY . .

# Build client
RUN cd client && npm run build

# Create public directory and copy build files
RUN mkdir -p server/public
RUN cp -r client/build/. server/public/

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Start server
WORKDIR /app/server
CMD ["node", "index.js"] 