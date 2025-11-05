FROM node:20-alpine3.21

# Install curl for health checks
RUN apk add --no-cache curl

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