# Use Node.js 18.20.8 as the base image
FROM node:18.20.8

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of application
COPY . .

# Start app
CMD ["node", "index.js"]