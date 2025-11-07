FROM node:20-alpine3.21

# Install sqlite3 for debugging
RUN apk add --no-cache python3 make g++ sqlite curl

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
