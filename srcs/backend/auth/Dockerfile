FROM node:lts-slim

# Install SQLite, Redis, and build tools for native modules
RUN apt-get update && apt-get install -y \
    sqlite3 \
    redis-server \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including dev dependencies for ts-node)
RUN npm install

# Rebuild native modules for Alpine
RUN npm rebuild better-sqlite3

# Copy the rest of the application files
COPY . .

# Build the TypeScript application
RUN npm run build

# Create storage directories
RUN mkdir -p /app/data/keys /app/data/db && chown -R node:node /app/data

# Startup script to launch Redis and Node
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 3000

CMD [ "npm", "start" ]
