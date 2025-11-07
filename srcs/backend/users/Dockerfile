FROM node:20-alpine3.21

# Install sqlite3 for debugging
RUN apk add --no-cache python3 make g++ sqlite curl

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Create avatar directory and copy default avatar (rarely changes)
RUN mkdir -p /app/data/avatar
# COPY assets/default.png /app/data/avatar/default.png

# Test images + default PNG
COPY assets/*.jpg /app/data/avatar/
COPY assets/*.gif /app/data/avatar/
COPY assets/*.jpeg /app/data/avatar/
COPY assets/*.png /app/data/avatar/
COPY assets/*.webp /app/data/avatar/

# Copy source code
COPY . .

EXPOSE 3000

# Use npm start script
CMD [ "npm", "start" ]