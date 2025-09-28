FROM node:20-alpine3.21

# Install sqlite3 for debugging
RUN apk add --no-cache sqlite

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Create avatar directory and copy default avatar (rarely changes)
RUN mkdir -p /app/data/avatar
COPY assets/default.png /app/data/avatar/default.png

# Copy source code
COPY . .

EXPOSE 3000

# Use npm start script
CMD [ "npm", "start" ]