<<<<<<< HEAD
FROM node:20-alpine

# Install SQLite and Redis
RUN apk add --no-cache sqlite redis
=======
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
>>>>>>> develop

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

<<<<<<< HEAD
# Install dependencies (production only)
RUN npm install --production
=======
# Install dependencies (including dev dependencies for ts-node)
RUN npm install

# Rebuild native modules for Alpine
RUN npm rebuild better-sqlite3
>>>>>>> develop

# Copy the rest of the application files
COPY . .

<<<<<<< HEAD
=======
# Build the TypeScript application
RUN npm run build

>>>>>>> develop
# Create storage directories
RUN mkdir -p /data/avatar && chown -R node:node /data

# Startup script to launch Redis and Node
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 3000

<<<<<<< HEAD
CMD ["/start.sh"]
=======
CMD [ "npm", "start" ]
>>>>>>> develop
