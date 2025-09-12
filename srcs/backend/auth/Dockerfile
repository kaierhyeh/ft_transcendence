FROM node:20-alpine

# Install SQLite and Redis
RUN apk add --no-cache sqlite redis

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (production only)
RUN npm install --production

# Copy the rest of the application files
COPY . .

# Create storage directories
RUN mkdir -p /data/avatar && chown -R node:node /data

# Startup script to launch Redis and Node
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 3000

CMD ["/start.sh"]
