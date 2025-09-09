# Use Node.js 18.20.8 as the base image
FROM node:18.20.8

# Install sqlite3 for debugging
RUN apk add --no-cache sqlite

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of application
COPY . .

EXPOSE 30001

# Start app
CMD [ "npm", "start" ]
