# Use Node.js 18.20.8 as the base image
FROM node:lts-alpine

# Install sqlite3 for debugging
RUN apk add --no-cache sqlite curl

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of application
COPY . .

EXPOSE 3000

# Start app
CMD [ "npm", "start" ]
