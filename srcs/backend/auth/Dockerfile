FROM node:lts-alpine

# Install sqlite3 for debugging
RUN apk add --no-cache sqlite

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

EXPOSE 3000

# Use npm start script
CMD [ "npm", "start" ]